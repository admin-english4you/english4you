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
 * URL pública da aplicação — o `back_url` do preapproval precisa ser acessível
 * pelo Mercado Pago, então em dev isso exige um túnel (ngrok/cloudflared) com
 * `NEXT_PUBLIC_APP_URL` apontando pra ele.
 */
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/** Janela de tolerância do timestamp assinado, em milissegundos (anti-replay). */
const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

interface VerifySignatureParams {
  /** Header `x-signature`, no formato `ts=<millis>,v1=<hex>`. */
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
  const tsMillis = Number(ts);
  if (!Number.isFinite(tsMillis) || Math.abs(now - tsMillis) > SIGNATURE_MAX_AGE_MS) {
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
