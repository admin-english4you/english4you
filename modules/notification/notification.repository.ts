import { db } from '@/lib/db';
import { notificationsTable } from './notification.schema';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { CreateNotificationInput, Notification } from './notification.types';

export const notificationRepository = {
  async createMany(inputs: CreateNotificationInput[]): Promise<Notification[]> {
    if (inputs.length === 0) return [];
    return await db.insert(notificationsTable).values(inputs).returning();
  },

  async findRecentByUserId(userId: string, limit = 20): Promise<Notification[]> {
    return await db.query.notificationsTable.findMany({
      where: eq(notificationsTable.userId, userId),
      orderBy: [desc(notificationsTable.createdAt)],
      limit,
    });
  },

  async countUnreadByUserId(userId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notificationsTable)
      .where(and(eq(notificationsTable.userId, userId), isNull(notificationsTable.readAt)));
    return Number(row?.count ?? 0);
  },

  /** Só marca lida a notificação se ela for do próprio usuário — posse na própria query. */
  async markRead(userId: string, notificationId: string): Promise<void> {
    await db
      .update(notificationsTable)
      .set({ readAt: new Date() })
      .where(and(eq(notificationsTable.id, notificationId), eq(notificationsTable.userId, userId)));
  },

  async markAllRead(userId: string): Promise<void> {
    await db
      .update(notificationsTable)
      .set({ readAt: new Date() })
      .where(and(eq(notificationsTable.userId, userId), isNull(notificationsTable.readAt)));
  },
};
