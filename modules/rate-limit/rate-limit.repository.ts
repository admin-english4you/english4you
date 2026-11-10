import { db } from '@/lib/db';
import { sql, lt } from 'drizzle-orm';
import { rateLimitHitsTable } from './rate-limit.schema';

export const rateLimitRepository = {
  /** Incrementa (ou cria) o contador da chave de forma atômica e devolve o valor novo. */
  async increment(key: string, expiresAt: Date): Promise<number> {
    const rows = await db
      .insert(rateLimitHitsTable)
      .values({ key, count: 1, expiresAt })
      .onConflictDoUpdate({
        target: rateLimitHitsTable.key,
        set: { count: sql`${rateLimitHitsTable.count} + 1` },
      })
      .returning({ count: rateLimitHitsTable.count });
    return rows[0]?.count ?? 1;
  },

  async deleteExpired(now: Date): Promise<void> {
    await db.delete(rateLimitHitsTable).where(lt(rateLimitHitsTable.expiresAt, now));
  },
};
