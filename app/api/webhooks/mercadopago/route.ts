import { verifyMercadoPagoSignature } from "@/lib/mercado-pago";
import { webhookEventService } from "@/modules/webhook-event/webhook-event.service";
import { paymentService } from "@/modules/payment/payment.service";
import { MercadoPagoWebhookSchema } from "@/modules/payment/payment.schema";
import { isRateLimited } from "@/lib/rate-limit";

/**
 * Webhook do Mercado Pago — assinatura recorrente do aluno.
 *
 * Segue `.agents/skills/route-writer.md`: HMAC → valida payload → checa
 * idempotência → delega pro Service. Nenhuma lógica de negócio aqui.
 *
 * Duas diferenças em relação ao webhook do Stream, ambas por conta de como o
 * Mercado Pago assina:
 *
 * 1. O MP NÃO assina o corpo da requisição — ele assina um manifest montado a
 *    partir do header `x-request-id` e do id do recurso. Por isso o corpo pode
 *    ser lido e parseado ANTES da verificação (no Stream isso invalidaria a
 *    assinatura), o que aqui é necessário: o id às vezes só existe no corpo.
 * 2. O id entra no manifest vindo do query param `data.id`, mas nem toda
 *    entrega traz a query string (o simulador do painel, por exemplo, posta na
 *    URL crua). Quando falta, o id do corpo é o mesmo valor — daí as duas
 *    tentativas em `signatureMatches`.
 *
 * CONFIGURAÇÃO MANUAL NECESSÁRIA: cadastrar esta URL
 * (`<domínio>/api/webhooks/mercadopago`) no painel do Mercado Pago em
 * Suas integrações → sua aplicação → Webhooks, para os tópicos
 * `subscription_preapproval` e `subscription_authorized_payment`, e copiar a
 * "assinatura secreta" gerada para `MERCADO_PAGO_WEBHOOK_SECRET`.
 *
 * ATENÇÃO ao modo: "Modo de teste" e "Modo de produção" têm cadastros E
 * segredos DIFERENTES. O segredo precisa ser o do mesmo modo das credenciais em
 * uso — `MERCADO_PAGO_ACCESS_TOKEN` começando com `TEST-` exige o segredo do
 * modo de teste.
 */

/** Tópicos que este webhook processa. O resto é ignorado com 200 — ver abaixo. */
const HANDLED_TYPES = ["subscription_preapproval", "subscription_authorized_payment"] as const;

type HandledType = (typeof HANDLED_TYPES)[number];

function isHandledType(type: string): type is HandledType {
  return (HANDLED_TYPES as readonly string[]).includes(type);
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`mp-webhook:${ip}`)) {
    return new Response("Too many requests", { status: 429 });
  }

  const signature = request.headers.get("x-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 401 });
  }

  // Dado externo: validação estrita antes de qualquer uso. Ainda não houve
  // nenhum efeito colateral — só parse em memória.
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(await request.text());
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  const parsed = MercadoPagoWebhookSchema.safeParse(parsedBody);
  if (!parsed.success) {
    return new Response("Invalid payload", { status: 400 });
  }

  const { type, action, data } = parsed.data;

  const requestId = request.headers.get("x-request-id");
  const queryDataId = new URL(request.url).searchParams.get("data.id");

  if (!signatureMatches({ signature, requestId, queryDataId, bodyDataId: data.id })) {
    return new Response("Invalid signature", { status: 401 });
  }

  // Tópicos que não tratamos saem ANTES da tabela de idempotência: o painel do
  // MP permite marcar dezenas de eventos, e registrar todos encheria
  // `processed_webhook_events` de lixo que nunca será consultado.
  //
  // Sair com 200 (e não com erro) é deliberado: resposta de erro faz o MP
  // reenfileirar e, após falhas seguidas, desabilitar o webhook inteiro —
  // inclusive os eventos de assinatura que nos interessam.
  if (!isHandledType(type)) {
    return new Response("OK", { status: 200 });
  }

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
  }

  return new Response("OK", { status: 200 });
}

/**
 * Confere a assinatura contra o id da query e, se não bater, contra o do corpo.
 *
 * A doc do MP monta o manifest com o `data.id` do query param, mas entregas sem
 * query string existem — e nelas o valor assinado é o mesmo id que veio no
 * corpo. Tentar os dois cobre as duas formas sem afrouxar nada: cada tentativa
 * é uma verificação HMAC completa, e uma assinatura forjada falha nas duas.
 */
function signatureMatches(input: {
  signature: string;
  requestId: string | null;
  queryDataId: string | null;
  bodyDataId: string;
}): boolean {
  const { signature, requestId, queryDataId, bodyDataId } = input;

  if (queryDataId && verifyMercadoPagoSignature({ signature, requestId, dataId: queryDataId })) {
    return true;
  }

  if (queryDataId === bodyDataId) return false;

  return verifyMercadoPagoSignature({ signature, requestId, dataId: bodyDataId });
}
