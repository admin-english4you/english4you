/**
 * Limitador de taxa em memória — segunda camada de defesa para rotas
 * públicas (a primeira, para webhooks, é a verificação HMAC).
 *
 * Limitação conhecida: estado por instância, não compartilhado entre
 * instâncias/cold starts em deploy serverless multi-região. Um limitador
 * durável (Vercel KV/Upstash) seria o próximo passo se isso se tornar um
 * problema real — não é um bloqueador para o volume esperado de um webhook
 * cujo único chamador legítimo é o próprio Stream.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;

const hits = new Map<string, number[]>();

export function isRateLimited(key: string, maxRequests = MAX_REQUESTS_PER_WINDOW): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  hits.set(key, timestamps);
  return timestamps.length > maxRequests;
}
