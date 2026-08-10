import { verifyAndParseStreamWebhook, recordIdFromCallCid } from "@/lib/stream-server";
import { webhookEventService } from "@/modules/webhook-event/webhook-event.service";
import { classService } from "@/modules/class/class.service";
import { isRateLimited } from "@/lib/rate-limit";

/**
 * Webhook do Stream — primeira rota `app/api/**` deste projeto.
 *
 * Segue `.agents/skills/route-writer.md`: HMAC → valida payload → checa
 * idempotência → delega pro Service. Nenhuma lógica de negócio aqui.
 *
 * Validação de payload: `streamClient.verifyAndParseWebhook` já faz o
 * trabalho de "Zod" pedido pela skill — decodifica (com suporte a gzip),
 * confere a assinatura E devolve um `WHEvent` TIPADO pelos tipos gerados do
 * SDK. Duplicar isso à mão num schema Zod só pra reimplementar validação que
 * o próprio SDK já garante seria sinal duplicado e frágil (o formato desses
 * eventos é responsabilidade do Stream, não nossa).
 *
 * CONFIGURAÇÃO MANUAL NECESSÁRIA: registrar esta URL
 * (`<domínio>/api/webhooks/stream`) no dashboard do Stream para os eventos
 * `call.recording_ready` e `call.ended` — isso não pode ser feito por código.
 */
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`stream-webhook:${ip}`)) {
    return new Response("Too many requests", { status: 429 });
  }

  // Texto cru, obrigatório: request.json() reformataria os bytes que a
  // assinatura HMAC cobre, invalidando a verificação.
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 401 });
  }

  const event = verifyAndParseStreamWebhook(rawBody, signature);
  if (!event) {
    return new Response("Invalid signature", { status: 401 });
  }

  // Chave de idempotência: os eventos de call não trazem um `id` estável
  // próprio, então compomos uma a partir dos campos disponíveis por tipo.
  // Narrowing explícito por `event.type` (em vez de `"x" in event`): a união
  // de eventos do Stream tem 170+ variantes e inclui um coringa (`type: '*'`
  // & CustomEvent com índice aberto) que impede o TS de estreitar com segurança
  // via checagem de propriedade genérica.
  const genericEvent = event as { call_cid?: string; created_at?: Date };
  const eventId =
    event.type === "call.recording_ready"
      ? `${event.type}:${event.call_cid}:${event.egress_id}`
      : `${event.type}:${genericEvent.call_cid ?? "unknown"}:${genericEvent.created_at?.toISOString() ?? Date.now()}`;

  const isNew = await webhookEventService.recordIfNew("stream", eventId, event.type);
  if (!isNew) {
    // Reentrega do provedor — já processado, responde OK sem reprocessar.
    return new Response("OK", { status: 200 });
  }

  switch (event.type) {
    case "call.recording_ready": {
      const recordId = recordIdFromCallCid(event.call_cid);
      if (recordId && event.call_recording?.url) {
        await classService.handleRecordingReady(recordId, event.call_recording.url);
      }
      break;
    }
    case "call.ended": {
      // Rede de segurança: se "Encerrar aula" falhou mas a call terminou
      // mesmo assim (ex: todos saíram), garante que completed vira true.
      const recordId = recordIdFromCallCid(event.call_cid);
      if (recordId) {
        await classService.handleCallEndedWebhook(recordId);
      }
      break;
    }
    default:
      // Qualquer outro evento do Stream (chat, moderação, etc.) é ignorado —
      // esta rota só existe para o fluxo de gravação da sala de aula.
      break;
  }

  return new Response("OK", { status: 200 });
}
