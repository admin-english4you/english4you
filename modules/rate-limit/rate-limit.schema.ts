import { pgTable, varchar, integer, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * Contador de janela fixa, DURÁVEL (Postgres) — ao contrário de `lib/rate-limit.ts`,
 * que é em memória e por instância (inútil em serverless: cada cold start zera).
 *
 * A chave já embute a janela (`<nome>:<identificador>:<início da janela>`), então
 * cada janela é uma linha nova e o incremento é um único upsert atômico.
 * `expiresAt` permite limpar linhas antigas sem tocar nas ativas.
 */
export const rateLimitHitsTable = pgTable(
  'rate_limit_hits',
  {
    key: varchar('key', { length: 300 }).primaryKey(),
    count: integer('count').notNull().default(0),
    expiresAt: timestamp('expires_at').notNull(),
  },
  (table) => [index('rate_limit_hits_expires_idx').on(table.expiresAt)]
);
