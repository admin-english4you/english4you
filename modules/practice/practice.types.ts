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

// ---------------------------------------------------------------------------
// Motor de prática (practice.engine.ts)
// ---------------------------------------------------------------------------

export type PracticeDayStatus =
  /** O dia ainda não chegou. */
  | 'LOCKED_FUTURE'
  /** É hoje: jogável e vale XP. */
  | 'AVAILABLE'
  /** Já foi feito; não pode ser refeito sem comprar. */
  | 'COMPLETED'
  /** Passou e não foi feito: só jogável se comprado com XP. */
  | 'EXPIRED'
  /** Comprado com XP: jogável, mas NÃO dá XP. */
  | 'REPLAYABLE'
  /** A lição não tem conteúdo aprovado para este modo. Injogável e não comprável. */
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
  /** Custo para desbloquear, preenchido apenas quando o dia é comprável. */
  unlockCost: number | null;
}

/** Sessão pronta para o player: itens montados e metadados do dia. */
export interface PracticeSession {
  lessonId: string;
  lessonTitle: string;
  dayIndex: number;
  renderMode: PracticeMode;
  items: PracticeItem[];
  audioUrl: string | null;
  /** 0 quando é replay comprado. */
  xpReward: number;
  isReplay: boolean;
}
