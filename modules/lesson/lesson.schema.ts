import { pgTable, uuid, varchar, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

/**
 * LessonStatusEnum (Status da Lição / Aula)
 * Este é um dos Enums mais importantes do seu projeto, pois ele controla a lógica de progressão do aluno e o desbloqueio da prática.
 *
 * DISABLED: A lição está bloqueada. O aluno não consegue acessá-la pois ainda não chegou nela.
 * IN_PROGRESS: A lição atual da turma. O professor vai abrir esta lição na próxima aula ao vivo.
 * ACTIVE: A lição já foi dada pelo professor. O aluno agora pode revisar a gravação, baixar o PDF e, principalmente, fazer a Prática.
 */
export const lessonStatusEnumDb = pgEnum('lesson_status', ['IN_PROGRESS', 'ACTIVE', 'DISABLED']);

export const lessonsTable = pgTable('lessons', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  level: varchar('level', { length: 50 }).notNull(),
  content: text('content').notNull(),
  audioUrl: varchar('audio_url', { length: 500 }),
  videoUrl: varchar('video_url', { length: 500 }),
  status: lessonStatusEnumDb('status').notNull().default('DISABLED'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('lessons_status_idx').on(table.status),
]);

export const LessonStatusEnum = z.enum(lessonStatusEnumDb.enumValues);

// Zod schemas directly from Drizzle
export const LessonSchema = createSelectSchema(lessonsTable);
export const InsertLessonSchema = createInsertSchema(lessonsTable);
