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

export const listeningClipSourceEnumDb = pgEnum('listening_clip_source', ['AI', 'UPLOAD']);
export const ListeningClipSourceEnum = z.enum(listeningClipSourceEnumDb.enumValues);

/**
 * Áudio curto da prática de compreensão auditiva (dia de `listening_choice`).
 *
 * Substitui o uso do áudio da AULA nas perguntas de listening: o aluno ouvia o
 * áudio inteiro para responder sobre um trecho. Cada clipe é curto, gerado
 * pela IA a partir do conteúdo da lição (`AI`) ou enviado pelo admin
 * (`UPLOAD`), e tem as próprias perguntas (`quiz_questions.clip_id`).
 * `transcript` é a fonte das perguntas: o roteiro (IA) ou a transcrição
 * (upload, feita pela IA ou colada pelo admin).
 */
export const listeningClipsTable = pgTable('listening_clips', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id').notNull().references(() => lessonsTable.id, { onDelete: 'cascade' }),
  source: listeningClipSourceEnumDb('source').notNull(),
  audioUrl: varchar('audio_url', { length: 500 }).notNull(),
  transcript: text('transcript').notNull(),
  /** Duração pedida pelo admin (só clipes gerados pela IA). */
  targetSeconds: integer('target_seconds'),
  questionCount: integer('question_count').notNull().default(1),
  voice: varchar('voice', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('listening_clips_lesson_idx').on(table.lessonId),
]);
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
  /**
   * Clipe de áudio da pergunta de listening. Null = pergunta antiga (legado),
   * feita sobre o áudio da aula: continua tocando `lessons.audioUrl`.
   */
  clipId: uuid('clip_id').references(() => listeningClipsTable.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('quiz_questions_lesson_idx').on(table.lessonId),
  index('quiz_questions_clip_idx').on(table.clipId),
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

/**
 * Pergunta com a seção declarada pela própria IA.
 *
 * O `AIGeneratedComprehensiveQuizSchema` acima existe para a geração INICIAL,
 * onde as 4 seções são preenchidas de uma vez e cada uma exige 5-10 perguntas.
 * Esse formato não serve para "gerar mais N": pedir 3 perguntas extras
 * esbarraria no mínimo de 5 por seção, e pedir as 4 seções de novo devolveria
 * 20-40 quando o admin queria 3. Aqui a lista é plana e a seção vem em cada
 * item, então a quantidade pedida é a quantidade recebida.
 */
export const AIGeneratedSectionedQuizQuestionSchema = z.object({
  question: z.string(),
  options: QuizQuestionOptionsSchema,
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().optional(),
  section: QuizSectionTypeEnum,
}).refine((data) => data.correctIndex < data.options.length, {
  message: 'correctIndex fora do intervalo de opções',
  path: ['correctIndex'],
});

export const AIGeneratedSectionedQuizSchema = z.array(AIGeneratedSectionedQuizQuestionSchema);

export const ListeningClipSchema = createSelectSchema(listeningClipsTable);

/** Vozes do TTS da OpenAI oferecidas ao admin (todas falam inglês nativo). */
export const ClipVoiceEnum = z.enum(['marin', 'cedar', 'coral', 'sage', 'ash', 'verse']);

export const CLIP_TARGET_SECONDS = [15, 30, 45, 60, 90] as const;

export const CreateAiClipSchema = z.object({
  lessonId: z.uuid(),
  planId: z.uuid(),
  targetSeconds: z.number().int().min(10).max(120),
  questionCount: z.number().int().min(1).max(3).default(1),
  voice: ClipVoiceEnum.default('marin'),
});

export const UpdateClipTranscriptSchema = z.object({
  clipId: z.uuid(),
  planId: z.uuid(),
  transcript: z.string().trim().min(1, 'A transcrição não pode ficar vazia.'),
});

export const DeleteClipSchema = z.object({
  clipId: z.uuid(),
  planId: z.uuid(),
});

/** Roteiro de um clipe, pedido à IA. */
/**
 * Roteiro em falas separadas. Cada fala vira um trecho de TTS com a voz do
 * seu personagem — num texto corrido, o TTS lia o nome da pessoa ("Waiter:")
 * e podia engolir a última fala.
 */
export const AIGeneratedClipScriptSchema = z.object({
  lines: z.array(z.object({ speaker: z.string(), text: z.string() })).min(1),
});

/** 1-3 perguntas sobre UM clipe curto (o schema de listening antigo exigia 5-10). */
export const AIGeneratedClipQuestionsSchema = z.array(AIGeneratedQuizQuestionSchema).min(1).max(3);

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

/**
 * "Gerar mais" — acréscimo incremental, decidido pelo admin por lição.
 *
 * Separado por tipo de propósito: o que falta na prática é ESTRUTURA (é dela
 * que saem os dias 2 e 3, um exercício por item), enquanto vocabulário e quiz
 * já batem no teto de 10/dia em praticamente toda lição. Um campo único
 * gastaria chamada de API devolvendo justamente o tipo que já sobra.
 *
 * Os números são ALVO, não garantia: o modelo entrega o que o texto da aula
 * comporta, e o service devolve quanto veio de fato para a tela poder dizer
 * "vieram 3 das 10 pedidas" em vez de fingir sucesso.
 */
export const GenerateMoreContentSchema = z
  .object({
    lessonId: z.uuid(),
    planId: z.uuid(),
    vocabCount: z.number().int().min(0).max(20).default(0),
    structureCount: z.number().int().min(0).max(20).default(0),
    quizCount: z.number().int().min(0).max(20).default(0),
    /**
     * Modo livre: a IA pode criar conteúdo além do texto da aula.
     *
     * Default `false` — só é ligado quando o admin escolhe explicitamente,
     * depois de a geração normal render menos do que o pedido. O que entra
     * por aqui é gravado como PENDENTE e precisa de revisão antes de chegar
     * ao aluno (ver `practiceService.generateMoreContent`).
     */
    allowInvented: z.boolean().default(false),
  })
  .refine((data) => data.vocabCount + data.structureCount + data.quizCount > 0, {
    message: 'Escolha ao menos um item para gerar.',
    path: ['vocabCount'],
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
 * Edição manual de um item pelo admin.
 *
 * `metadata` reusa o schema completo (VocabMetadata | StructureMetadata) em vez
 * de aceitar um recorte: o que é salvo aqui vai direto para o mesmo campo que a
 * IA preenche, e o motor de prática lê os dois sem distinguir a origem. Validar
 * com um schema mais frouxo abriria a porta para um item editado à mão quebrar
 * um render mode que o item gerado nunca quebraria.
 */
export const UpdateLearningItemSchema = z
  .object({
    itemId: z.uuid(),
    planId: z.uuid(),
    lemma: z.string().trim().min(1, 'O termo não pode ficar vazio.'),
    metadata: LearningItemMetadataSchema,
  })
  .superRefine((data, ctx) => {
    // Só na edição manual: itens gerados pela IA não passam por aqui, e barrar
    // um lote inteiro por causa de uma contração tokenizada diferente seria pior.
    data.metadata.examples.forEach((example, index) => {
      if (!('word_order' in example)) return;
      if (!wordOrderMatchesText(example as z.infer<typeof StructureMetadataSchema>['examples'][number])) {
        ctx.addIssue({
          code: 'custom',
          path: ['metadata', 'examples', index, 'word_order'],
          message: `Exemplo ${index + 1}: as palavras do "monte a frase" precisam ser as mesmas da frase, na mesma ordem.`,
        });
      }
    });
  });

/** Palavras de uma frase normalizadas para comparação (minúsculas, sem pontuação). */
export function sentenceTokens(text: string): string[] {
  return text
    .split(/\s+/)
    .map((word) => word.toLowerCase().replace(/[^\p{L}\p{N}'’-]/gu, ''))
    .filter(Boolean);
}

/**
 * O banco de palavras do "monte a frase" bate com a frase do exemplo?
 *
 * Se divergirem, o aluno monta uma frase diferente da que aparece como
 * resposta, e o "completar a frase" pode descartar o item em silêncio.
 */
export function wordOrderMatchesText(example: { text: string; word_order: { word: string; index: number }[] }): boolean {
  const fromWords = [...example.word_order]
    .sort((a, b) => a.index - b.index)
    .flatMap((w) => sentenceTokens(w.word));
  const fromText = sentenceTokens(example.text);
  return fromWords.length === fromText.length && fromWords.every((word, i) => word === fromText[i]);
}

/** Edição manual de uma pergunta de quiz pelo admin. */
export const UpdateQuizQuestionSchema = z
  .object({
    questionId: z.uuid(),
    planId: z.uuid(),
    question: z.string().trim().min(1, 'A pergunta não pode ficar vazia.'),
    options: z.array(z.string().trim().min(1, 'Alternativa vazia.')).length(4, 'A pergunta precisa ter exatamente 4 alternativas'),
    correctIndex: z.number().int().min(0).max(3),
    explanation: z.string().trim().optional(),
  })
  .refine((data) => new Set(data.options.map((o) => o.toLowerCase())).size === data.options.length, {
    message: 'As alternativas não podem se repetir.',
    path: ['options'],
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
    quiz: z.object({ question: z.string(), options: z.array(z.string()), correctIndex: z.number(), explanation: z.string().optional(), audioUrl: z.string().optional() }).optional(),
  })
});
