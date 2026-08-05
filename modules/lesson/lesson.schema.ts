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
  transcript: text('transcript'),
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

/** Criação inicial de uma lição: apenas título e nível (conteúdo é editado depois). */
export const CreateLessonSchema = z.object({
  title: z.string().min(2, 'O título da lição é obrigatório'),
  level: z.string().min(1, 'Informe o nível da lição'),
});

export const UpdateLessonSchema = z.object({
  lessonId: z.uuid(),
  title: z.string().min(2, 'O título da lição é obrigatório').optional(),
  level: z.string().min(1, 'Informe o nível da lição').optional(),
  content: z.string().optional(),
  transcript: z.string().optional(),
});

/**
 * Nesta UI de autoria só alternamos DISABLED <-> ACTIVE. IN_PROGRESS é um
 * conceito de aula ao vivo (fluxo de Turmas) e não é setado por aqui.
 */
export const UpdateLessonStatusSchema = z.object({
  lessonId: z.uuid(),
  status: z.enum(['ACTIVE', 'DISABLED']),
});

export const ClearLessonMediaSchema = z.object({
  lessonId: z.uuid(),
  kind: z.enum(['audio', 'video']),
});

/** Reidrata (baixa + reenvia pro nosso Storage) uma imagem externa colada no editor. */
export const RehostContentImageSchema = z.object({
  lessonId: z.uuid(),
  sourceUrl: z.url('URL de imagem inválida'),
});

/** Apaga do Storage as imagens do conteúdo que foram removidas do editor ao salvar. */
export const DeleteContentImagesSchema = z.object({
  lessonId: z.uuid(),
  imageUrls: z.array(z.string()).max(50),
});
