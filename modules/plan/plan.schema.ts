import { pgTable, uuid, varchar, text, timestamp, pgEnum, integer, index, primaryKey } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { lessonsTable } from '@/modules/lesson/lesson.schema';

/**
 * PlanStatusEnum (Status do Plano de Ensino)
 * Controla a visibilidade dos pacotes inteiros de ensino (ex: "Inglês Básico 1").
 *
 * DRAFT: O coordenador ainda está montando o plano. Não aparece para os professores.
 * ACTIVE: O plano está pronto e pode ser atrelado a turmas.
 * ARCHIVED: O plano é antigo e não é mais vendido, mas mantido no histórico.
 */
export const planStatusEnumDb = pgEnum('plan_status', ['DRAFT', 'ACTIVE', 'ARCHIVED']);

export const plansTable = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: planStatusEnumDb('status').notNull().default('DRAFT'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('plans_status_idx').on(table.status),
]);

/**
 * TABELA DE JUNÇÃO M:N
 * Define a ordem das Lessons dentro de um Plan.
 */
export const planLessonsTable = pgTable('plan_lessons', {
  planId: uuid('plan_id').notNull().references(() => plansTable.id, { onDelete: 'cascade' }),
  lessonId: uuid('lesson_id').notNull().references(() => lessonsTable.id, { onDelete: 'restrict' }),
  order: integer('order').notNull(),
}, (table) => [
  primaryKey({ columns: [table.planId, table.lessonId] }),
  index('plan_lessons_plan_order_idx').on(table.planId, table.order),
]);

export const PlanStatusEnum = z.enum(planStatusEnumDb.enumValues);

// Zod schemas directly from Drizzle
export const PlanSchema = createSelectSchema(plansTable);
export const InsertPlanSchema = createInsertSchema(plansTable);

export const PlanLessonSchema = createSelectSchema(planLessonsTable, {
  order: (schema) => schema.positive(),
});
