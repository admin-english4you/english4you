import { db } from '@/lib/db';
import { and, eq, gte, sql } from 'drizzle-orm';
import { practiceDayCompletionsTable, practiceDayUnlocksTable } from './progress.schema';
import type { PracticeDayCompletion, PracticeDayUnlock, NewPracticeDayCompletion } from './progress.types';

export const progressRepository = {
  async findCompletionsByUser(userId: string): Promise<PracticeDayCompletion[]> {
    return await db.query.practiceDayCompletionsTable.findMany({
      where: eq(practiceDayCompletionsTable.userId, userId),
    });
  },

  async findUnlocksByUser(userId: string): Promise<PracticeDayUnlock[]> {
    return await db.query.practiceDayUnlocksTable.findMany({
      where: eq(practiceDayUnlocksTable.userId, userId),
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

  async findUnlock(
    userId: string,
    lessonId: string,
    dayIndex: number
  ): Promise<PracticeDayUnlock | undefined> {
    return await db.query.practiceDayUnlocksTable.findFirst({
      where: and(
        eq(practiceDayUnlocksTable.userId, userId),
        eq(practiceDayUnlocksTable.lessonId, lessonId),
        eq(practiceDayUnlocksTable.dayIndex, dayIndex)
      ),
    });
  },

  /**
   * Registra a conclusão do dia. É IDEMPOTENTE: se a linha já existe (refresh,
   * duplo submit, replay comprado), apenas incrementa `redoCount` e mexe em
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
   * Saldo de XP derivado das duas tabelas — nunca armazenado em coluna.
   *
   * neon-http não tem `db.transaction()`; um contador materializado
   * inevitavelmente dessincroniza. Ambas as somas usam índices por `user_id`.
   */
  async getXpTotals(userId: string, weekStart: Date): Promise<{
    earnedTotal: number;
    earnedThisWeek: number;
    spentTotal: number;
  }> {
    const [[earned], [earnedWeek], [spent]] = await Promise.all([
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
      db
        .select({ total: sql<number>`coalesce(sum(${practiceDayUnlocksTable.xpSpent}), 0)` })
        .from(practiceDayUnlocksTable)
        .where(eq(practiceDayUnlocksTable.userId, userId)),
    ]);

    return {
      earnedTotal: Number(earned?.total ?? 0),
      earnedThisWeek: Number(earnedWeek?.total ?? 0),
      spentTotal: Number(spent?.total ?? 0),
    };
  },

  /**
   * Compra de um dia passado, em UM único statement condicional.
   *
   * Por que assim: neon-http não suporta `db.transaction()` e `db.batch()` não
   * faz escrita condicional. Ler o saldo e depois inserir abriria uma janela
   * para gasto duplo em cliques rápidos. Aqui a checagem de saldo vive no
   * `WHERE` do próprio INSERT, e o `ON CONFLICT DO NOTHING` (sustentado pelo
   * unique index `practice_day_unlocks_uq`) garante uma linha por dia.
   *
   * Zero linhas retornadas significa saldo insuficiente OU já desbloqueado —
   * quem chama relê para escolher a mensagem correta.
   */
  async insertUnlockIfAffordable(
    userId: string,
    lessonId: string,
    dayIndex: number,
    xpCost: number
  ): Promise<boolean> {
    const result = await db.execute(sql`
      INSERT INTO practice_day_unlocks (user_id, lesson_id, day_index, xp_spent)
      SELECT ${userId}::uuid, ${lessonId}::uuid, ${dayIndex}, ${xpCost}
      WHERE (
        (SELECT COALESCE(SUM(xp_earned), 0) FROM practice_day_completions WHERE user_id = ${userId}::uuid)
        - (SELECT COALESCE(SUM(xp_spent), 0) FROM practice_day_unlocks WHERE user_id = ${userId}::uuid)
      ) >= ${xpCost}
      ON CONFLICT (user_id, lesson_id, day_index) DO NOTHING
      RETURNING id
    `);

    const rows = Array.isArray(result) ? result : result.rows;
    return (rows?.length ?? 0) > 0;
  },
};
