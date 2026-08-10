import { db } from '@/lib/db';
import { processedWebhookEventsTable } from './webhook-event.schema';

export const webhookEventRepository = {
  /**
   * Insere o evento se ainda não tiver sido processado. Devolve `true` se
   * esta chamada é quem inseriu (evento novo), `false` se já existia
   * (reentrega do provedor — não processar de novo).
   */
  async insertIfNew(provider: string, eventId: string, eventType: string): Promise<boolean> {
    const rows = await db
      .insert(processedWebhookEventsTable)
      .values({ provider, eventId, eventType })
      .onConflictDoNothing()
      .returning({ id: processedWebhookEventsTable.id });
    return rows.length > 0;
  },
};
