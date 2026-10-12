import { z } from 'zod';
import {
  PracticeModeEnum,
  VocabMetadataSchema,
  StructureMetadataSchema,
  LearningItemSchema,
  LearningItemReviewStatusEnum,
  AIGeneratedLearningItemSchema,
  PracticeItemSchema,
  learningItemsTable,
  QuizQuestionSchema,
  QuizRenderModeEnum,
  AIGeneratedQuizQuestionSchema,
  quizQuestionsTable,
  ListeningClipSchema,
  listeningClipsTable,
  ClipVoiceEnum,
} from './practice.schema';
import { QuizSectionTypeEnum } from './practice.schema';

export type PracticeMode = z.infer<typeof PracticeModeEnum>;

export type VocabMetadata = z.infer<typeof VocabMetadataSchema>;
export type StructureMetadata = z.infer<typeof StructureMetadataSchema>;
export type LearningItemReviewStatus = z.infer<typeof LearningItemReviewStatusEnum>;
export type LearningItem = z.infer<typeof LearningItemSchema>;
export type NewLearningItem = typeof learningItemsTable.$inferInsert;
export type AIGeneratedLearningItem = z.infer<typeof AIGeneratedLearningItemSchema>;
export type PracticeItem = z.infer<typeof PracticeItemSchema>;

export type QuizSectionType = z.infer<typeof QuizSectionTypeEnum>;
export type QuizRenderMode = z.infer<typeof QuizRenderModeEnum>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type NewQuizQuestion = typeof quizQuestionsTable.$inferInsert;
export type AIGeneratedQuizQuestion = z.infer<typeof AIGeneratedQuizQuestionSchema>;

export type ListeningClip = z.infer<typeof ListeningClipSchema>;
export type NewListeningClip = typeof listeningClipsTable.$inferInsert;
export type ClipVoice = z.infer<typeof ClipVoiceEnum>;

// ---------------------------------------------------------------------------
// Motor de prática (practice.engine.ts)
// ---------------------------------------------------------------------------

/**
 * Tudo é jogável, exceto EMPTY: o aluno pode adiantar dias futuros, fazer os
 * atrasados e refazer os concluídos quando quiser. O status só diz ONDE o dia
 * está em relação a hoje — e o XP é indicativo de quanto ele pratica, não
 * moeda (a primeira conclusão de cada dia vale XP; refazer, não).
 */
export type PracticeDayStatus =
  /** O dia ainda não chegou — mas já dá para adiantar. */
  | 'UPCOMING'
  /** É hoje. */
  | 'AVAILABLE'
  /** Já foi feito; pode ser refeito à vontade, sem XP. */
  | 'COMPLETED'
  /** Passou e não foi feito: continua liberado. */
  | 'LATE'
  /** A lição não tem conteúdo aprovado para este modo. Injogável. */
  | 'EMPTY';

/** Um slot do ciclo: qual modo e, no caso de quiz, quais seções entram. */
export interface CycleSlot {
  dayIndex: number;
  renderMode: PracticeMode;
  quizSections: QuizSectionType[] | null;
}

/** Entrada do motor: uma aula já ministrada e a lição correspondente. */
export interface CycleSource {
  lessonId: string;
  lessonTitle: string;
  lessonLevel: string;
  classRecordId: string;
  /**
   * Dia em que a aula foi de fato dada ('YYYY-MM-DD') — `completedAt` do
   * registro, não a data agendada. O ciclo começa no dia SEGUINTE a este.
   */
  classDateKey: string;
  /** Dia em que a lição foi publicada; o ciclo nunca começa antes disso. */
  activatedDayKey: string | null;
  hasAudio: boolean;
}

export interface PracticeDayDescriptor {
  lessonId: string;
  lessonTitle: string;
  lessonLevel: string;
  /** Só proveniência para a UI — NUNCA usado como chave de persistência. */
  classRecordId: string;
  classDateKey: string;
  dayIndex: number;
  /** Dia em que esta atividade fica disponível ('YYYY-MM-DD'). */
  dateKey: string;
  renderMode: PracticeMode;
  quizSections: QuizSectionType[] | null;
  xpReward: number;
}

export interface PracticeDayState extends PracticeDayDescriptor {
  status: PracticeDayStatus;
  /** XP já ganho neste dia, ou null se nunca foi concluído. */
  xpEarned: number | null;
}

/** Sessão pronta para o player: itens montados e metadados do dia. */
export interface PracticeSession {
  lessonId: string;
  lessonTitle: string;
  dayIndex: number;
  renderMode: PracticeMode;
  items: PracticeItem[];
  /** 0 quando o dia já foi concluído antes (refazer não dá XP). */
  xpReward: number;
  isReplay: boolean;
}

/**
 * Resultado de "gerar mais" para um tipo de conteúdo.
 *
 * `requested` e `inserted` vêm separados porque quase nunca são iguais: o
 * modelo devolve o que o texto da aula comporta, e o prompt manda entregar
 * menos em vez de inventar. `duplicates` conta o que a IA repetiu do que já
 * existia e foi barrado — sem esse número, "pedi 10 e vieram 3" não distingue
 * "o texto não dá mais" de "a IA repetiu 7 vezes o que já tinha".
 */
export interface GenerateMoreCount {
  requested: number;
  inserted: number;
  duplicates: number;
}

export interface GenerateMoreReport {
  vocab: GenerateMoreCount;
  structure: GenerateMoreCount;
  quiz: GenerateMoreCount;
  /**
   * Explicação da própria IA para ter devolvido menos do que o pedido.
   *
   * Vem na MESMA chamada da geração, e não de uma pergunta prévia do tipo
   * "dá pra gerar mais?": modelo responde mal a isso no abstrato (tende a
   * dizer que sim e entregar um item). É o motivo que diz ao admin se vale
   * editar o texto da aula ou se o assunto simplesmente se esgotou.
   */
  reason: string | null;
  /** Conteúdo entrou como PENDENTE (modo livre) e precisa de revisão. */
  pendingReview: boolean;
}
