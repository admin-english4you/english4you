import { pgTable, uuid, varchar, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';

/**
 * Registro de idempotência genérico para webhooks de provedores externos
 * (Stream hoje; Mercado Pago segue o mesmo padrão quando a rota existir).
 * O unique index em (provider, eventId) é o que sustenta a garantia de
 * "processar cada evento no máximo uma vez", via ON CONFLICT DO NOTHING.
 */
export const processedWebhookEventsTable = pgTable(
  'processed_webhook_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    provider: varchar('provider', { length: 50 }).notNull(),
    eventId: varchar('event_id', { length: 255 }).notNull(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    receivedAt: timestamp('received_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('processed_webhook_events_provider_event_uq').on(table.provider, table.eventId),
  ]
);

export const ProcessedWebhookEventSchema = createSelectSchema(processedWebhookEventsTable);
