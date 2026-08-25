import { pgTable, uuid, varchar, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { usersTable } from '@/modules/user/user.schema';

/**
 * Uma inscrição de push por DISPOSITIVO/navegador, não por usuário — o mesmo
 * aluno pode ter o celular e o notebook inscritos ao mesmo tempo, cada um com
 * sua própria `endpoint`/chaves.
 *
 * `endpoint` é único (não `(userId, endpoint)`): ele já identifica fisicamente
 * um navegador específico, e isso dá um alvo natural pra upsert quando o
 * mesmo navegador se inscreve de novo (troca de chave, ou login em outra
 * conta no mesmo aparelho).
 */
export const pushSubscriptionsTable = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
    endpoint: varchar('endpoint', { length: 500 }).notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    userAgent: varchar('user_agent', { length: 255 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('push_subscriptions_endpoint_uq').on(table.endpoint),
    index('push_subscriptions_user_idx').on(table.userId),
  ]
);

export const PushSubscriptionSchema = createSelectSchema(pushSubscriptionsTable);

/**
 * Formato exato de `PushSubscription.toJSON()` do navegador — é isso que o
 * client manda pra `subscribePushAction` sem transformação nenhuma.
 */
export const SubscribePushSchema = z.object({
  endpoint: z.url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const UnsubscribePushSchema = z.object({
  endpoint: z.url(),
});
