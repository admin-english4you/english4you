import { db } from '@/lib/db';
import { pushSubscriptionsTable } from './push-notification.schema';
import { usersTable } from '@/modules/user/user.schema';
import { practiceDayCompletionsTable } from '@/modules/progress/progress.schema';
import { and, eq, gte, inArray, lt, notExists } from 'drizzle-orm';
import { addDaysToKey, todayKey, zonedWallClockToUtc } from '@/lib/date';
import { NewPushSubscription, PendingReminderSubscription } from './push-notification.types';

export const pushNotificationRepository = {
  /**
   * Insere ou atualiza pelo `endpoint`: o mesmo navegador pode se reinscrever
   * (chave rotacionada, ou login em outra conta no mesmo aparelho) sem virar
   * linha duplicada.
   */
  async upsertSubscription(data: NewPushSubscription): Promise<void> {
    await db
      .insert(pushSubscriptionsTable)
      .values(data)
      .onConflictDoUpdate({
        target: pushSubscriptionsTable.endpoint,
        set: {
          userId: data.userId,
          p256dh: data.p256dh,
          auth: data.auth,
          userAgent: data.userAgent,
        },
      });
  },

  async deleteByEndpointForUser(userId: string, endpoint: string): Promise<void> {
    await db
      .delete(pushSubscriptionsTable)
      .where(and(eq(pushSubscriptionsTable.userId, userId), eq(pushSubscriptionsTable.endpoint, endpoint)));
  },

  /** Limpeza em lote de inscrições mortas (o push service respondeu 404/410). */
  async deleteExpiredSubscriptions(endpoints: string[]): Promise<void> {
    if (endpoints.length === 0) return;
    await db.delete(pushSubscriptionsTable).where(inArray(pushSubscriptionsTable.endpoint, endpoints));
  },

  /**
   * Alunos inscritos que ainda não praticaram HOJE (dia civil de São Paulo).
   *
   * `completedAt` é gravado em UTC pelo Postgres (`defaultNow()`); os limites
   * do "hoje" vêm de `zonedWallClockToUtc`/`addDaysToKey`, nunca de `new
   * Date()` cru — senão uma prática feita às 22h de Brasília (já 01h UTC do
   * dia seguinte) escaparia da checagem, ou o inverso.
   */
  async findStudentSubscriptionsPendingReminder(): Promise<PendingReminderSubscription[]> {
    const todayStartUtc = zonedWallClockToUtc(todayKey(), '00:00');
    const todayEndUtc = zonedWallClockToUtc(addDaysToKey(todayKey(), 1), '00:00');

    return await db
      .select({
        subscriptionId: pushSubscriptionsTable.id,
        userId: pushSubscriptionsTable.userId,
        endpoint: pushSubscriptionsTable.endpoint,
        p256dh: pushSubscriptionsTable.p256dh,
        auth: pushSubscriptionsTable.auth,
      })
      .from(pushSubscriptionsTable)
      .innerJoin(usersTable, eq(usersTable.id, pushSubscriptionsTable.userId))
      .where(
        and(
          eq(usersTable.role, 'STUDENT'),
          notExists(
            db
              .select({ id: practiceDayCompletionsTable.id })
              .from(practiceDayCompletionsTable)
              .where(
                and(
                  eq(practiceDayCompletionsTable.userId, pushSubscriptionsTable.userId),
                  gte(practiceDayCompletionsTable.completedAt, todayStartUtc),
                  lt(practiceDayCompletionsTable.completedAt, todayEndUtc)
                )
              )
          )
        )
      );
  },
};
