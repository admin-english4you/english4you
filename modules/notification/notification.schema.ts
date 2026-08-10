import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { usersTable } from '@/modules/user/user.schema';

/**
 * varchar + $type<>, não pgEnum: um tipo de notificação novo não deve exigir
 * ALTER TYPE — mesmo raciocínio do `renderMode` em modules/progress.
 */
export type NotificationType = 'CLASS_RECORDING_READY';

export const notificationsTable = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).$type<NotificationType>().notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    link: varchar('link', { length: 500 }),
    readAt: timestamp('read_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('notifications_user_idx').on(table.userId),
    index('notifications_user_unread_idx').on(table.userId, table.readAt),
    index('notifications_user_created_idx').on(table.userId, table.createdAt),
  ]
);

export const NotificationSchema = createSelectSchema(notificationsTable);

export const MarkNotificationReadSchema = z.object({
  notificationId: z.uuid(),
});
