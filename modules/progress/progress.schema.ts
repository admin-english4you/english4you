import { pgTable, uuid, integer, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { usersTable } from '@/modules/user/user.schema';
import { lessonsTable } from '@/modules/lesson/lesson.schema';
import type { PracticeMode } from '@/modules/practice/practice.types';

/**
 * CHAVE DE IDENTIDADE DE UM DIA DE PRÁTICA: (userId, lessonId, dayIndex).
 *
 * Não usamos `classRecordId`: `classService.assignPlan` chama
 * `deleteNonCompletedRecords`, e como `class_records.completed` nunca é
 * marcado como true, trocar o plano da turma apaga 100% dos records — o que
 * levaria embora (por cascade) todo o XP e histórico do aluno.
 *
 * `lessonId` é substituto sem perda: `class_records.lessonId` tem
 * `onDelete: 'restrict'` (a lição sobrevive ao record) e o
 * `uniqueIndex('class_records_group_lesson_uq')` garante um único record por
 * (turma, lição) — dentro da turma do aluno a relação é bijetiva. Também é
 * semanticamente melhor: "já fiz o dia 3 de Present Perfect" sobrevive a
 * troca de plano, transferência de turma e regeração da grade.
 */
export const practiceDayCompletionsTable = pgTable(
  'practice_day_completions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessonsTable.id, { onDelete: 'cascade' }),
    dayIndex: integer('day_index').notNull(), // 1..6
    // varchar + $type<>, e não pgEnum: PracticeModeEnum é um enum Zod sem
    // contraparte no Postgres. Criar uma seria uma segunda fonte de verdade,
    // exigindo ALTER TYPE a cada modo novo. Aqui é só um snapshot do modo
    // jogado no dia, para histórico.
    renderMode: varchar('render_mode', { length: 32 }).$type<PracticeMode>().notNull(),
    xpEarned: integer('xp_earned').notNull().default(0),
    redoCount: integer('redo_count').notNull().default(0),
    completedAt: timestamp('completed_at').notNull().defaultNow(),
    lastPlayedAt: timestamp('last_played_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('practice_day_completions_uq').on(table.userId, table.lessonId, table.dayIndex),
    index('practice_day_completions_user_idx').on(table.userId),
    index('practice_day_completions_user_date_idx').on(table.userId, table.completedAt),
  ]
);

/**
 * Dias passados desbloqueados com XP.
 *
 * Tabela separada da de conclusões porque uma compra pode mirar um dia que
 * NUNCA foi concluído (o aluno simplesmente perdeu o dia) — não existiria
 * linha de conclusão onde gravar um flag.
 *
 * O unique index é parte da corretude, não só performance: é ele que faz o
 * `ON CONFLICT DO NOTHING` do gasto atômico funcionar (ver progress.repository).
 */
export const practiceDayUnlocksTable = pgTable(
  'practice_day_unlocks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessonsTable.id, { onDelete: 'cascade' }),
    dayIndex: integer('day_index').notNull(),
    xpSpent: integer('xp_spent').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('practice_day_unlocks_uq').on(table.userId, table.lessonId, table.dayIndex),
    index('practice_day_unlocks_user_idx').on(table.userId),
  ]
);

export const PracticeDayCompletionSchema = createSelectSchema(practiceDayCompletionsTable);
export const PracticeDayUnlockSchema = createSelectSchema(practiceDayUnlocksTable);

/** Input das actions do aluno. O cliente manda apenas isto — nunca XP nem score. */
export const PracticeDayRefSchema = z.object({
  lessonId: z.uuid(),
  dayIndex: z.number().int().min(1).max(6),
});

export const CompletePracticeDaySchema = PracticeDayRefSchema;
export const PurchasePracticeDaySchema = PracticeDayRefSchema;
