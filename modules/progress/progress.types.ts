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

/** Saldo derivado das duas tabelas — nunca armazenado (ver progress.repository). */
export interface XpSummary {
  balance: number;
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
  xp: XpSummary;
  weeklyGoal: number;
  unlockCost: number;
  todayKey: string;
}

export interface CompleteDayResult {
  xpEarned: number;
  newBalance: number;
  wasReplay: boolean;
  renderMode: PracticeMode;
}

export interface PurchaseResult {
  xpSpent: number;
  newBalance: number;
}
