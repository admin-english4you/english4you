import { pgTable, uuid, varchar, text, timestamp, pgEnum, integer, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { usersTable } from '@/modules/user/user.schema';
import { plansTable } from '@/modules/plan/plan.schema';
import { lessonsTable } from '@/modules/lesson/lesson.schema';

/**
 * ClassStatusEnum (Status da Turma)
 * Controla o ciclo de vida de uma turma de alunos. Turmas nunca são deletadas,
 * apenas transicionam de status, para preservar o histórico.
 *
 * ACTIVE: A turma está tendo aulas normalmente. Único status em que a turma pode ser editada.
 * INACTIVE: Turma desativada — os alunos são desvinculados da turma (ficam sem turma).
 *   Somente-leitura; pode ser reativada (volta para ACTIVE) ou arquivada (vai para COMPLETED).
 * COMPLETED: Turma arquivada/encerrada. Somente-leitura permanente; o histórico fica salvo.
 */
export const classStatusEnumDb = pgEnum('class_status', ['ACTIVE', 'INACTIVE', 'COMPLETED']);

export const WeekdayEnum = z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);

export const ScheduleSlotSchema = z.object({
  weekday: WeekdayEnum,
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido (use HH:MM)'),
});

export const ScheduleSchema = z.array(ScheduleSlotSchema).min(1, 'Defina ao menos um horário para a turma');

export type ScheduleSlot = z.infer<typeof ScheduleSlotSchema>;

export const classGroupsTable = pgTable('class_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  level: varchar('level', { length: 50 }).notNull(),
  schedule: jsonb('schedule').$type<ScheduleSlot[]>().notNull(),
  maxStudents: integer('max_students').notNull().default(12),
  teacherId: uuid('teacher_id').references(() => usersTable.id),
  planId: uuid('plan_id').references(() => plansTable.id),
  status: classStatusEnumDb('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('class_groups_teacher_idx').on(table.teacherId),
  index('class_groups_plan_idx').on(table.planId),
  index('class_groups_status_idx').on(table.status),
]);

export const classRecordsTable = pgTable('class_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  classGroupId: uuid('class_group_id').notNull().references(() => classGroupsTable.id, { onDelete: 'cascade' }),
  lessonId: uuid('lesson_id').notNull().references(() => lessonsTable.id, { onDelete: 'restrict' }),
  // Nullable: só é preenchido quando há um professor SUBSTITUTO para esta aula específica.
  // Quando null, a UI usa o professor titular da turma (classGroup.teacherId) como fallback.
  teacherId: uuid('teacher_id').references(() => usersTable.id),
  date: timestamp('date').notNull(),
  // Array, não uma URL só: o professor pode reabrir a chamada quantas vezes
  // precisar (internet/energia pode cair no meio da aula) — cada reabertura
  // gera um novo segmento de gravação no Stream, e todos ficam associados a
  // esta mesma aula em vez de o último sobrescrever os anteriores.
  recordingUrls: text('recording_urls').array().notNull().default([]),
  // Ponto de partida do professor nesta ocorrência da aula — copiado de
  // lessons.content na primeira vez que a sala é aberta (ver
  // TeacherClassRoom), depois editado livremente. Isolado do material
  // canônico: editar aqui nunca afeta lessons.content nem outras turmas que
  // usam a mesma lição via o plano.
  boardContent: text('board_content'),
  completed: boolean('completed').notNull().default(false),
  attendance: uuid('attendance').array().notNull().default([]),
  // Sinal de "chamada ao vivo", sem round-trip à API do Stream para renderizar
  // o badge de status. NULL = não iniciada; NOT NULL + completed=false = ao
  // vivo agora; completed=true = encerrada. Nunca é limpo ao encerrar (fica
  // para exibir duração/histórico).
  callStartedAt: timestamp('call_started_at'),
}, (table) => [
  index('class_records_class_group_idx').on(table.classGroupId),
  index('class_records_date_idx').on(table.date),
  // Trava contra geração duplicada: uma lição só pode aparecer uma vez por turma.
  uniqueIndex('class_records_group_lesson_uq').on(table.classGroupId, table.lessonId),
]);

export const ClassStatusEnum = z.enum(classStatusEnumDb.enumValues);

// Zod schemas directly from Drizzle
export const ClassGroupSchema = createSelectSchema(classGroupsTable, {
  schedule: ScheduleSchema,
});
export const InsertClassGroupSchema = createInsertSchema(classGroupsTable, {
  schedule: ScheduleSchema,
});
export const ClassRecordSchema = createSelectSchema(classRecordsTable);
export const InsertClassRecordSchema = createInsertSchema(classRecordsTable);

/** Criação inicial de turma: apenas nome, nível e horário (professor/plano são definidos depois). */
export const CreateClassGroupSchema = InsertClassGroupSchema.pick({
  name: true,
  level: true,
  schedule: true,
});

// Schemas de input das Actions (não persistidos diretamente)
export const UpdateClassBasicSchema = InsertClassGroupSchema.pick({
  name: true,
  level: true,
  schedule: true,
}).partial().extend({
  classGroupId: z.uuid(),
});

export const AssignTeacherSchema = z.object({
  classGroupId: z.uuid(),
  teacherId: z.uuid(),
});

export const AssignPlanSchema = z.object({
  classGroupId: z.uuid(),
  planId: z.uuid(),
});

export const AddStudentSchema = z.object({
  classGroupId: z.uuid(),
  studentId: z.uuid(),
});

export const RemoveStudentSchema = z.object({
  classGroupId: z.uuid(),
  studentId: z.uuid(),
});

export const TransferStudentSchema = z.object({
  studentId: z.uuid(),
  sourceClassGroupId: z.uuid(),
  targetClassGroupId: z.uuid(),
});

export const DeactivateClassSchema = z.object({
  classGroupId: z.uuid(),
});

export const ReactivateClassSchema = z.object({
  classGroupId: z.uuid(),
});

export const ArchiveClassSchema = z.object({
  classGroupId: z.uuid(),
});

export const AssignSubstituteTeacherSchema = z.object({
  classRecordId: z.uuid(),
  teacherId: z.uuid(),
});

// Schemas do fluxo de sala de aula do professor
export const StartCallSchema = z.object({
  recordId: z.uuid(),
});

/** Liga a gravação — chamado pelo client assim que o professor entra de fato na call (ver Fase 7). */
export const StartCallRecordingSchema = z.object({
  recordId: z.uuid(),
});

export const EndCallSchema = z.object({
  recordId: z.uuid(),
});

export const SaveBoardContentSchema = z.object({
  recordId: z.uuid(),
  boardContent: z.string(),
});

export const ActivateLessonSchema = z.object({
  recordId: z.uuid(),
});

export const MarkAttendanceSchema = z.object({
  recordId: z.uuid(),
});

export const GetTeacherStudentDetailSchema = z.object({
  classGroupId: z.uuid(),
  studentId: z.uuid(),
});

/** Usado pelo aluno pra saber (via poll leve) se o professor já iniciou a chamada. */
export const GetStudentCallAccessSchema = z.object({
  recordId: z.uuid(),
});

/** Troca a sessão atual por um custom token do Firebase pro board ao vivo (RTDB). */
export const GetBoardAuthTokenSchema = z.object({
  recordId: z.uuid(),
});

/** Baixa (no servidor) uma imagem externa colada no board e reenvia pro nosso Storage. */
export const RehostBoardContentImageSchema = z.object({
  recordId: z.uuid(),
  sourceUrl: z.url('URL de imagem inválida'),
});

/** Apaga do Storage as imagens do board que foram removidas do editor ao salvar. */
export const DeleteBoardContentImagesSchema = z.object({
  recordId: z.uuid(),
  imageUrls: z.array(z.string()).max(50),
});
