import { rateLimitRepository } from './rate-limit.repository';

export interface RateLimitRule {
  /** Máximo de ocorrências permitidas dentro da janela. */
  limit: number;
  windowSeconds: number;
}

export const rateLimitService = {
  /**
   * Registra uma ocorrência e diz se ela ainda cabe no limite.
   *
   * FAIL-OPEN de propósito: se o banco falhar (ou a tabela ainda não existir
   * num deploy fora de ordem), o limite é ignorado em vez de bloquear usuários
   * legítimos — este controle protege contra abuso, não é uma porta de acesso.
   */
  async allow(name: string, identifier: string, rule: RateLimitRule): Promise<boolean> {
    try {
      const windowMs = rule.windowSeconds * 1000;
      const now = Date.now();
      const windowStart = Math.floor(now / windowMs) * windowMs;
      const key = `${name}:${identifier.slice(0, 200)}:${windowStart}`;

      const count = await rateLimitRepository.increment(key, new Date(windowStart + windowMs * 2));

      // Limpeza oportunista (~2% das chamadas): sem cron, a tabela não cresce sem limite.
      if (Math.random() < 0.02) {
        rateLimitRepository.deleteExpired(new Date(now)).catch(() => {});
      }

      return count <= rule.limit;
    } catch (err) {
      console.error('[rate-limit] falha ao registrar — liberando (fail-open):', err);
      return true;
    }
  },
};
