import { verifyMercadoPagoSignature } from "@/lib/mercado-pago";
import { webhookEventService } from "@/modules/webhook-event/webhook-event.service";
import { paymentService } from "@/modules/payment/payment.service";
import { MercadoPagoWebhookSchema } from "@/modules/payment/payment.schema";
import { isRateLimited } from "@/lib/rate-limit";

/**
 * Webhook do Mercado Pago — assinatura recorrente do aluno.
 *
 * Segue `.agents/skills/route-writer.md` e espelha `app/api/webhooks/stream`:
 * HMAC → valida payload → checa idempotência → delega pro Service. Nenhuma
 * lógica de negócio aqui.
 *
 * Diferença importante em relação ao Stream: o Mercado Pago NÃO assina o corpo
 * da requisição. Ele assina um manifest montado a partir do header
 * `x-request-id` e do query param `data.id` — por isso a validação usa a URL, e
 * não o `rawBody` (que só é lido para o parse do payload).
 *
 * CONFIGURAÇÃO MANUAL NECESSÁRIA: registrar esta URL
 * (`<domínio>/api/webhooks/mercadopago`) no painel do Mercado Pago
 * (Suas integrações → Webhooks) para os tópicos `subscription_preapproval` e
 * `subscription_authorized_payment`, e copiar a "assinatura secreta" gerada lá
 * para `MERCADO_PAGO_WEBHOOK_SECRET` — isso não pode ser feito por código.
 */
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`mp-webhook:${ip}`)) {
    return new Response("Too many requests", { status: 429 });
  }

  const url = new URL(request.url);
  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  // O id assinado vem da query string; o corpo só é usado depois, para saber o
  // tópico. Em algumas entregas o MP omite a query — daí o fallback no parse.
  const queryDataId = url.searchParams.get("data.id");

  if (!signature) {
    return new Response("Missing signature", { status: 401 });
  }

  if (!verifyMercadoPagoSignature({ signature, requestId, dataId: queryDataId })) {
    return new Response("Invalid signature", { status: 401 });
  }

  // Dado externo: validação estrita antes de qualquer uso.
  const rawBody = await request.text();
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  const parsed = MercadoPagoWebhookSchema.safeParse(parsedBody);
  if (!parsed.success) {
    return new Response("Invalid payload", { status: 400 });
  }

  const { type, action, data } = parsed.data;

  const eventId = `${type}:${action ?? "unknown"}:${data.id}`;
  const isNew = await webhookEventService.recordIfNew("mercadopago", eventId, type);
  if (!isNew) {
    // Reentrega do provedor — já processado, responde OK sem reprocessar.
    return new Response("OK", { status: 200 });
  }

  switch (type) {
    case "subscription_preapproval":
      await paymentService.syncPreapprovalFromWebhook(data.id);
      break;
    case "subscription_authorized_payment":
      await paymentService.recordAuthorizedPaymentFromWebhook(data.id);
      break;
    default:
      // O MP entrega tópicos que não assinamos (`payment`, `merchant_order`).
      // Ignorar com 200 é deliberado: responder erro faz o MP reenfileirar e,
      // após várias falhas, desabilitar o webhook inteiro — inclusive os
      // eventos de assinatura que nos interessam.
      break;
  }

  return new Response("OK", { status: 200 });
}
