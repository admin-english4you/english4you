import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { lessonsTable } from '@/modules/lesson/lesson.schema';

export const ItemTypeEnum = z.enum(['VOCABULARY', 'STRUCTURE']);
export const QuizSectionTypeEnum = z.enum(['vocabulary', 'grammar', 'context', 'comprehension']);

/**
 * Cada enum abaixo representa o formato que o frontend vai usar para renderizar
 * a prática do dia.
 * REGRA DE NEGÓCIO: Se a Lesson não tiver 'audioUrl', o 'listening_choice'
 * não é usado, e o 'quiz_comprehensive' é dividido em dois dias.
 * por exemplo, quando há audioUrl, entao o quiz section teria: ['vocabulary', 'grammar', 'context', 'comprehension']
 * quando nao ha audioUrl, entao o quiz section teria: ['vocabulary', 'grammar', 'context'] 
 * e o dia do listening_choice e teria o comprehension do quiz-section
 */
export const PracticeModeEnum = z.enum([
  'flashcard_visual',
  'gap_fill_listening',
  'sentence_unscramble',
  'flashcard_recall',
  'quiz_comprehensive',
  'listening_choice',
  'review_standard'
]);

/**
 * METADADOS DOS ITENS DE APRENDIZADO (Gerados pela IA na criação da Lição)
 * A IA gera uma lista contendo entre X e Y itens baseados no conteúdo da Lição.
 */
export const VocabMetadataSchema = z.object({
  type: z.string(), // "noun", "verb", "adjective", etc.
  level: z.string(), // "A1", "B2", etc.
  phonetic: z.string(),
  translation: z.string().optional(),
  is_visual: z.boolean(),
  key_image_words: z.string(),
  image_url: z.url().nullable().optional(),
  meanings: z.array(z.object({
    definition: z.string(),
    translation: z.string(),
  })),
  forms: z.object({
    base: z.string(),
    past: z.string().optional(),
    participle: z.string().optional(),
    plural: z.string().optional(),
  }),
  examples: z.array(z.object({
    text: z.string(),
    translation: z.string(),
  })).min(2, 'É preciso de pelo menos 2 exemplos de vocabulário'),
  synonyms: z.array(z.string()).optional(),
});

export const StructureMetadataSchema = z.object({
  level: z.string(),
  structure_type: z.string(), // e.g. "Verb Tense", "Passive Voice"
  syntactic_pattern: z.string().optional(), // e.g. "SVO", "SV", "SVC"
  translation: z.string().optional(),
  explanation: z.string(),
  examples: z.array(z.object({
    text: z.string(),
    translation: z.string(),
    word_order: z.array(z.object({
      word: z.string(),
      index: z.number(),
      role: z.string() // "subject", "verb", "object", etc.
    }))
  })).min(3, 'É preciso de pelo menos 3 exemplos de estrutura'),
});

export const LearningItemMetadataSchema = z.union([VocabMetadataSchema, StructureMetadataSchema]);

export const learningItemTypeEnumDb = pgEnum('learning_item_type', ['VOCABULARY', 'STRUCTURE']);
export const learningItemReviewStatusEnumDb = pgEnum('learning_item_review_status', ['PENDING', 'APPROVED']);

/**
 * Um LearningItem é sempre autorado para exatamente UMA lição (FK direta, sem
 * tabela de junção M:N — não há reuso de itens entre lições nesta versão).
 * `metadata` guarda o VocabMetadata OU StructureMetadata conforme `type`.
 * `reviewStatus` controla o fluxo de revisão do admin após a geração via IA:
 * itens gerados já entram como APPROVED (o admin remove os que não quiser,
 * em vez de aprovar um a um). PENDING existe no schema para uma eventual
 * etapa de revisão explícita no futuro, mas não é o padrão hoje.
 * Uma lição só pode ser ativada (DISABLED -> ACTIVE) quando não há mais
 * nenhum item PENDING.
 */
export const learningItemsTable = pgTable('learning_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id').notNull().references(() => lessonsTable.id, { onDelete: 'cascade' }),
  type: learningItemTypeEnumDb('type').notNull(),
  lemma: varchar('lemma', { length: 255 }).notNull(),
  metadata: jsonb('metadata').$type<z.infer<typeof VocabMetadataSchema> | z.infer<typeof StructureMetadataSchema>>().notNull(),
  reviewStatus: learningItemReviewStatusEnumDb('review_status').notNull().default('APPROVED'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('learning_items_lesson_idx').on(table.lessonId),
  index('learning_items_lesson_status_idx').on(table.lessonId, table.reviewStatus),
]);

export const LearningItemReviewStatusEnum = z.enum(learningItemReviewStatusEnumDb.enumValues);

export const quizRenderModeEnumDb = pgEnum('quiz_question_render_mode', ['quiz_comprehensive', 'listening_choice']);
export const quizSectionEnumDb = pgEnum('quiz_question_section', ['vocabulary', 'grammar', 'context', 'comprehension']);

export const QuizRenderModeEnum = z.enum(quizRenderModeEnumDb.enumValues);

/**
 * Pergunta de múltipla escolha (4 alternativas) de compreensão, gerada pela
 * IA junto com os LearningItems. Cobre os renderModes `quiz_comprehensive`
 * (com `section` preenchida: vocabulary/grammar/context/comprehension) e
 * `listening_choice` (sobre trechos específicos do áudio, `section`
 * fica null). Mesmo padrão de revisão dos LearningItems: entra APPROVED,
 * admin remove o que não quiser. Uma lição só pode ser ativada quando
 * existir pelo menos 1 aprovada em cada seção do comprehensive (e, se a
 * lição tiver mídia, pelo menos 1 de listening_choice também).
 */
export const quizQuestionsTable = pgTable('quiz_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id').notNull().references(() => lessonsTable.id, { onDelete: 'cascade' }),
  renderMode: quizRenderModeEnumDb('render_mode').notNull(),
  section: quizSectionEnumDb('section'),
  question: text('question').notNull(),
  options: jsonb('options').$type<string[]>().notNull(),
  correctIndex: integer('correct_index').notNull(),
  explanation: text('explanation'),
  reviewStatus: learningItemReviewStatusEnumDb('review_status').notNull().default('APPROVED'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('quiz_questions_lesson_idx').on(table.lessonId),
  index('quiz_questions_lesson_mode_section_idx').on(table.lessonId, table.renderMode, table.section),
]);

export const QuizQuestionOptionsSchema = z.array(z.string()).length(4, 'A pergunta precisa ter exatamente 4 alternativas');

export const QuizQuestionSchema = createSelectSchema(quizQuestionsTable, {
  options: QuizQuestionOptionsSchema,
});
export const InsertQuizQuestionSchema = createInsertSchema(quizQuestionsTable, {
  options: QuizQuestionOptionsSchema,
});

/**
 * Formato exato pedido à IA para uma pergunta (sem id/lessonId/renderMode/
 * section/reviewStatus/createdAt, atribuídos pelo servidor conforme o lote).
 */
export const AIGeneratedQuizQuestionSchema = z.object({
  question: z.string(),
  options: QuizQuestionOptionsSchema,
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().optional(),
}).refine((data) => data.correctIndex < data.options.length, {
  message: 'correctIndex fora do intervalo de opções',
  path: ['correctIndex'],
});

/** Resposta da chamada combinada do quiz_comprehensive: 5-10 perguntas por seção. */
export const AIGeneratedComprehensiveQuizSchema = z.object({
  vocabulary: z.array(AIGeneratedQuizQuestionSchema).min(5).max(10),
  grammar: z.array(AIGeneratedQuizQuestionSchema).min(5).max(10),
  context: z.array(AIGeneratedQuizQuestionSchema).min(5).max(10),
  comprehension: z.array(AIGeneratedQuizQuestionSchema).min(5).max(10),
});

/** Resposta da chamada do listening_choice: 5-10 perguntas sobre trechos específicos do áudio. */
export const AIGeneratedListeningQuizSchema = z.array(AIGeneratedQuizQuestionSchema).min(5).max(10);

export const ApproveQuizQuestionSchema = z.object({
  questionId: z.uuid(),
  planId: z.uuid(),
});

export const DeleteQuizQuestionSchema = z.object({
  questionId: z.uuid(),
  planId: z.uuid(),
});

export const LearningItemSchema = createSelectSchema(learningItemsTable, {
  metadata: LearningItemMetadataSchema,
});
export const InsertLearningItemSchema = createInsertSchema(learningItemsTable, {
  metadata: LearningItemMetadataSchema,
});

/**
 * Formato exato pedido à IA: sem id/lessonId/reviewStatus/createdAt, que são
 * sempre atribuídos pelo servidor. Usado como response_format da OpenAI
 * (via z.toJSONSchema) e para validar a resposta antes de persistir.
 */
export const AIGeneratedLearningItemSchema = z.object({
  type: ItemTypeEnum,
  lemma: z.string(),
  metadata: LearningItemMetadataSchema,
});
export const AIGeneratedLearningItemsSchema = z.array(AIGeneratedLearningItemSchema);

// Schemas de input das Actions (planId incluído só para revalidatePath preciso da página do plano)
export const GenerateLearningItemsSchema = z.object({
  lessonId: z.uuid(),
  planId: z.uuid(),
});

export const ApproveLearningItemSchema = z.object({
  itemId: z.uuid(),
  planId: z.uuid(),
});

export const DeleteLearningItemSchema = z.object({
  itemId: z.uuid(),
  planId: z.uuid(),
});

/**
 * A ESTRUTURA FINAL DA PRÁTICA
 * Isso não é gerado pela IA. O backend/frontend monta isso em tempo real já que os dados já existem
 * e seus metadados (metadata.examples, metadata.forms) para os 7 renderModes.
 *
 * 1. O Sistema identifica "Onde o aluno está"
 * Antes de puxar os itens, o backend descobre qual é a lição atual do aluno. Isso geralmente vem do progresso dele:
 * Pode ser a lição do ClassRecord (a aula que o professor acabou de dar).
 *
 * 2. A Consulta no Banco de Dados (Usando a Tabela de Junção)
 * Com o lessonId em mãos, o backend faz uma consulta no banco de dados na tabela LessonLearningItem.
 *
 * 3. A Montagem Final (A Transformação para PracticeItem)
 * Neste momento, os dados já foram pegos do banco. O backend agora verifica: "Qual é o dia de prática hoje? Dia 2? Então o renderMode é gap_fill_listening."
 * O backend pega aquele JSON bruto, extrai as frases de exemplo (metadata.examples) e monta o objeto PracticeItem final.
 */
export const PracticeItemSchema = z.object({
  id: z.uuid(),
  lessonId: z.string().uuid(),
  type: z.enum(["item", "structure"]),
  renderMode: PracticeModeEnum,
  mainText: z.string(),
  // O sistema preenche a estrutura correta extraindo dados do VocabMetadata ou StructureMetadata
  data: z.object({
    flashcard: z.object({ front: z.string(), back: z.string(), imageUrl: z.string().nullable().optional(), useTTS: z.boolean().default(true) }).optional(),
    gapFill: z.object({ sentenceWithGap: z.string(), correctAnswer: z.string(), fullSentenceForTTS: z.string().optional() }).optional(),
    unscramble: z.object({ scrambledWords: z.array(z.string()), correctOrder: z.array(z.string()) }).optional(),
    quiz: z.object({ question: z.string(), options: z.array(z.string()), correctIndex: z.number(), explanation: z.string().optional() }).optional(),
  })
});
