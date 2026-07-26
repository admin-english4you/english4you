import { z } from 'zod';

export const ItemTypeEnum = z.enum(['VOCABULARY', 'STRUCTURE']);
export const QuizSectionTypeEnum = z.enum(['vocabulary', 'grammar', 'timestamp', 'context', 'comprehension']);

/**
 * Cada enum abaixo representa o formato que o frontend vai usar para renderizar
 * a prática do dia. 
 * REGRA DE NEGÓCIO: Se a Lesson não tiver 'audioUrl', o 'listening_choice' 
 * não é usado, e o 'quiz_comprehensive' é dividido em dois dias.
 * por exemplo, quando há audioUrl, entao o quiz section teria: ['vocabulary', 'grammar', 'timestamp', 'context', 'comprehension']
 * quando nao ha audioUrl, entao o quiz section teria: ['vocabulary', 'grammar', 'timestamp', 'context']
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
  image_url: z.string().url().nullable().optional(),
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
  })),
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
  }))
});

export const LearningItemSchema = z.object({
  id: z.uuid(),
  type: ItemTypeEnum, // VOCABULARY ou STRUCTURE
  lemma: z.string(), // A palavra base ou nome da estrutura
  metadata: z.union([VocabMetadataSchema, StructureMetadataSchema]), 
  createdAt: z.date(),
});

/**
 * TABELA DE JUNÇÃO M:N
 * Apenas diz: "Este LearningItem pertence a esta Lesson". 
 * Uma Lesson terá N LearningItems.
 */
export const LessonLearningItemSchema = z.object({
  lessonId: z.string().uuid(),
  itemId: z.string().uuid(),
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
