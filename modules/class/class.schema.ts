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
  streamVideoUrl: varchar('stream_video_url', { length: 500 }),
  boardContent: text('board_content'),
  completed: boolean('completed').notNull().default(false),
  attendance: uuid('attendance').array().notNull().default([]),
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
