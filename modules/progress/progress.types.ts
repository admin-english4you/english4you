import { z } from 'zod';
import {
  PracticeDayCompletionSchema,
  PracticeDayRefSchema,
  PracticeDayUnlockSchema,
  practiceDayCompletionsTable,
  practiceDayUnlocksTable,
} from './progress.schema';
import type { PracticeDayState, PracticeMode } from '@/modules/practice/practice.types';

export type PracticeDayCompletion = z.infer<typeof PracticeDayCompletionSchema>;
export type NewPracticeDayCompletion = typeof practiceDayCompletionsTable.$inferInsert;
export type PracticeDayUnlock = z.infer<typeof PracticeDayUnlockSchema>;
export type NewPracticeDayUnlock = typeof practiceDayUnlocksTable.$inferInsert;
export type PracticeDayRef = z.infer<typeof PracticeDayRefSchema>;

/** XP é só indicativo de prática: total e da semana, derivados das conclusões. */
export interface XpSummary {
  earnedTotal: number;
  earnedThisWeek: number;
}

/** Uma "unidade" da trilha: uma lição e seus 6 dias. */
export interface PracticeLessonSection {
  lessonId: string;
  lessonTitle: string;
  lessonLevel: string;
  classRecordId: string;
  classDateKey: string;
  hasAudio: boolean;
  days: PracticeDayState[];
  completedCount: number;
}

export interface PracticePathView {
  sections: PracticeLessonSection[];
  /** Dias liberados hoje — podem vir de lições diferentes (ciclos se sobrepõem). */
  today: PracticeDayState[];
  /** Dias que passaram sem ser feitos, ainda liberados. Mais antigo primeiro. */
  late: PracticeDayState[];
  xp: XpSummary;
  weeklyGoal: number;
  todayKey: string;
}

export interface CompleteDayResult {
  xpEarned: number;
  newTotal: number;
  wasReplay: boolean;
  renderMode: PracticeMode;
}
