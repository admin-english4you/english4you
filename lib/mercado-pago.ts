import crypto from "crypto";
import { MercadoPagoConfig, PreApproval, Invoice, Payment } from "mercadopago";

/**
 * Cliente server-side do Mercado Pago (assinatura recorrente do aluno).
 *
 * Espelha o padrão de `lib/stream-server.ts` e `lib/resend.ts`: singleton
 * preguiçoso, export nulável — todo chamador checa antes de usar, em vez de o
 * módulo lançar no import se a env var faltar (o build e os testes rodam sem
 * credenciais do MP).
 *
 * Usamos `preapproval` SEM plano associado: cada aluno tem a própria assinatura,
 * com valor e `end_date` vindos do pacote dele. Não existe um "plano" comum
 * porque cada pacote tem duração própria e o contrato tem data de início própria.
 */

let mpConfig: MercadoPagoConfig | null = null;

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

if (accessToken) {
  mpConfig = new MercadoPagoConfig({ accessToken });
}

export const preApprovalClient = mpConfig ? new PreApproval(mpConfig) : null;

/**
 * `Invoice` é o nome que o SDK dá ao endpoint `/authorized_payments`: cada
 * cobrança recorrente gerada por um preapproval. É o que o webhook
 * `subscription_authorized_payment` referencia.
 */
export const invoiceClient = mpConfig ? new Invoice(mpConfig) : null;

/**
 * Pagamento avulso. Usado só para ler a bandeira e os 4 últimos dígitos do
 * cartão de uma cobrança aprovada — nem o preapproval nem a invoice expõem isso.
 */
export const paymentClient = mpConfig ? new Payment(mpConfig) : null;

/**
 * URL pública da aplicação, sem barra no fim.
 *
 * Ordem de resolução:
 * 1. `NEXT_PUBLIC_APP_URL` — o domínio próprio, quando existir. Em dev, aponte
 *    para um túnel (cloudflared/ngrok); localhost não serve como `back_url`.
 * 2. `VERCEL_PROJECT_PRODUCTION_URL` — injetada pela Vercel, é o domínio
 *    ESTÁVEL de produção. Existe para que um deploy sem a variável do passo 1
 *    ainda funcione, em vez de cair silenciosamente em localhost e o Mercado
 *    Pago devolver "Invalid value for back_url" 400 requisições depois.
 * 3. `VERCEL_URL` — domínio efêmero daquele deploy específico (preview).
 * 4. localhost, para desenvolvimento local.
 *
 * As duas variáveis da Vercel vêm sem protocolo (`meu-app.vercel.app`), por
 * isso o `https://` é acrescentado aqui.
 */
export function getAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return stripTrailingSlash(explicit);

  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercelHost) return `https://${stripTrailingSlash(vercelHost)}`;

  return "http://localhost:3000";
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * O Mercado Pago só aceita como `back_url` uma URL https pública: localhost e
 * http puro voltam como 400 "Invalid value for back_url". Checar antes de
 * chamar a API transforma um erro remoto genérico numa mensagem que diz qual
 * variável de ambiente está faltando.
 *
 * Devolve `null` quando a URL serve, ou o motivo quando não serve.
 */
export function describeUnusableBackUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return `"${url}" não é uma URL válida.`;
  }

  // O host vem ANTES do protocolo de propósito: `http://localhost:3000` viola
  // as duas regras, e "aponta para a própria máquina" é o diagnóstico que leva
  // a pessoa a definir NEXT_PUBLIC_APP_URL — "exige https" faria ela só trocar
  // o protocolo e falhar de novo.
  const host = parsed.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local")) {
    return `"${url}" aponta para a própria máquina e o Mercado Pago não consegue alcançá-la.`;
  }

  if (parsed.protocol !== "https:") {
    return `o Mercado Pago exige https, e a URL configurada é "${url}".`;
  }

  return null;
}

/** Janela de tolerância do timestamp assinado, em milissegundos (anti-replay). */
const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Converte o `ts` da assinatura para milissegundos.
 *
 * O Mercado Pago envia o timestamp em SEGUNDOS (`ts=1704908010`), não em
 * milissegundos. Tratar segundos como ms colocava a notificação em 1970 e a
 * checagem de replay rejeitava TODA notificação real com 401 — enquanto
 * qualquer teste nosso passava, porque gerávamos o `ts` com `Date.now()`.
 *
 * A normalização é por magnitude, e não por um formato fixo, porque o mesmo
 * instante tem ordens de grandeza inconfundíveis: em segundos, um epoch atual
 * tem ~10 dígitos (1e9); em milissegundos, ~13 (1e12). O corte em 1e11
 * equivale ao ano 5138 em segundos e a março de 1973 em milissegundos — não há
 * data plausível que caia no lado errado.
 */
function toMillis(ts: number): number {
  return ts < 1e11 ? ts * 1000 : ts;
}

interface VerifySignatureParams {
  /** Header `x-signature`, no formato `ts=<epoch>,v1=<hex>` — o MP usa segundos. */
  signature: string | null;
  /** Header `x-request-id`. */
  requestId: string | null;
  /** Query param `data.id` da notificação. */
  dataId: string | null;
  /** Injetável só para teste — o "agora" usado na checagem de replay. */
  now?: number;
}

/**
 * Valida a assinatura HMAC de um webhook do Mercado Pago.
 *
 * Diferente do Stream (que assina o corpo cru e tem verificador no SDK), o MP
 * assina um *manifest* montado a partir do header `x-request-id` e do query
 * param `data.id` — o corpo NÃO entra no cálculo. Por isso não dá pra reusar
 * `verifyAndParseStreamWebhook`.
 *
 * Formato do manifest, conforme a doc: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 * Partes ausentes na notificação são omitidas do manifest (não viram string vazia).
 */
export function verifyMercadoPagoSignature({
  signature,
  requestId,
  dataId,
  now = Date.now(),
}: VerifySignatureParams): boolean {
  if (!webhookSecret) {
    console.warn("[MercadoPago] MERCADO_PAGO_WEBHOOK_SECRET ausente — webhook rejeitado.");
    return false;
  }
  if (!signature) return false;

  const parts = new Map<string, string>();
  for (const chunk of signature.split(",")) {
    const [key, value] = chunk.split("=", 2);
    if (key && value) parts.set(key.trim(), value.trim());
  }

  const ts = parts.get("ts");
  const receivedHash = parts.get("v1");
  if (!ts || !receivedHash) return false;

  // Replay: o MP reenvia a mesma notificação em caso de falha, mas sempre com
  // `ts` novo. Um `ts` velho indica reprodução de uma requisição capturada.
  const tsNumber = Number(ts);
  if (!Number.isFinite(tsNumber)) return false;
  if (Math.abs(now - toMillis(tsNumber)) > SIGNATURE_MAX_AGE_MS) {
    return false;
  }

  const manifest = buildSignatureManifest({ dataId, requestId, ts });
  const expectedHash = crypto.createHmac("sha256", webhookSecret).update(manifest).digest("hex");

  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const receivedBuffer = Buffer.from(receivedHash, "hex");
  // `timingSafeEqual` lança se os tamanhos diferirem — o guard evita transformar
  // uma assinatura malformada em exceção não tratada dentro da rota.
  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

/**
 * Monta o manifest assinado. Exportado para o teste: é a única parte da
 * verificação em que um detalhe silencioso (ordem, `;` final, minusculização
 * do id) quebra tudo sem dar erro visível.
 */
export function buildSignatureManifest({
  dataId,
  requestId,
  ts,
}: {
  dataId: string | null;
  requestId: string | null;
  ts: string;
}): string {
  let manifest = "";
  // O MP minusculiza ids alfanuméricos antes de assinar.
  if (dataId) manifest += `id:${dataId.toLowerCase()};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  return manifest;
}
