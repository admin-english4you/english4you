import { webhookEventRepository } from './webhook-event.repository';

/**
 * Sem RBAC — este módulo só é chamado a partir de rotas de webhook
 * (`app/api/webhooks/**`), nunca de uma request com sessão de usuário.
 */
export const webhookEventService = {
  async recordIfNew(provider: string, eventId: string, eventType: string): Promise<boolean> {
    return await webhookEventRepository.insertIfNew(provider, eventId, eventType);
  },
};
