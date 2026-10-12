import { db } from '@/lib/db';
import { and, eq, gte, sql } from 'drizzle-orm';
import { practiceDayCompletionsTable } from './progress.schema';
import type { PracticeDayCompletion, NewPracticeDayCompletion } from './progress.types';

export const progressRepository = {
  async findCompletionsByUser(userId: string): Promise<PracticeDayCompletion[]> {
    return await db.query.practiceDayCompletionsTable.findMany({
      where: eq(practiceDayCompletionsTable.userId, userId),
    });
  },

  async findCompletion(
    userId: string,
    lessonId: string,
    dayIndex: number
  ): Promise<PracticeDayCompletion | undefined> {
    return await db.query.practiceDayCompletionsTable.findFirst({
      where: and(
        eq(practiceDayCompletionsTable.userId, userId),
        eq(practiceDayCompletionsTable.lessonId, lessonId),
        eq(practiceDayCompletionsTable.dayIndex, dayIndex)
      ),
    });
  },

  /**
   * Registra a conclusão do dia. É IDEMPOTENTE: se a linha já existe (refresh,
   * duplo submit, refazer), apenas incrementa `redoCount` e mexe em
   * `lastPlayedAt` — `xpEarned` nunca é alterado depois da primeira vez.
   */
  async upsertCompletion(data: NewPracticeDayCompletion): Promise<PracticeDayCompletion> {
    const [row] = await db
      .insert(practiceDayCompletionsTable)
      .values(data)
      .onConflictDoUpdate({
        target: [
          practiceDayCompletionsTable.userId,
          practiceDayCompletionsTable.lessonId,
          practiceDayCompletionsTable.dayIndex,
        ],
        set: {
          redoCount: sql`${practiceDayCompletionsTable.redoCount} + 1`,
          lastPlayedAt: new Date(),
        },
      })
      .returning();
    return row;
  },

  /**
   * XP total e da semana, somados das conclusões — nunca armazenado em coluna
   * (neon-http não tem `db.transaction()`; um contador materializado
   * dessincronizaria). XP é só indicativo de prática: não há mais gasto.
   */
  async getXpTotals(userId: string, weekStart: Date): Promise<{
    earnedTotal: number;
    earnedThisWeek: number;
  }> {
    const [[earned], [earnedWeek]] = await Promise.all([
      db
        .select({ total: sql<number>`coalesce(sum(${practiceDayCompletionsTable.xpEarned}), 0)` })
        .from(practiceDayCompletionsTable)
        .where(eq(practiceDayCompletionsTable.userId, userId)),
      db
        .select({ total: sql<number>`coalesce(sum(${practiceDayCompletionsTable.xpEarned}), 0)` })
        .from(practiceDayCompletionsTable)
        .where(
          and(
            eq(practiceDayCompletionsTable.userId, userId),
            gte(practiceDayCompletionsTable.completedAt, weekStart)
          )
        ),
    ]);

    return {
      earnedTotal: Number(earned?.total ?? 0),
      earnedThisWeek: Number(earnedWeek?.total ?? 0),
    };
  },
};
