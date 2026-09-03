import { verifyAndParseStreamWebhook, recordIdFromCallCid } from "@/lib/stream-server";
import { webhookEventService } from "@/modules/webhook-event/webhook-event.service";
import { isRateLimited } from "@/lib/rate-limit";

/**
 * `maxDuration` generoso: `handleRecordingReady` faz várias chamadas de rede
 * (Resend, notificações) antes de responder, e o default de 10s é apertado
 * numa turma grande. Não resolve cold start — só evita que a NOSSA função
 * corte a própria execução no meio do processamento.
 */
export const maxDuration = 30;

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

  // Bytes crus, obrigatório: request.json() reformataria os bytes que a
  // assinatura HMAC cobre, invalidando a verificação. request.text() também
  // corrompe: decodifica como UTF-8, e o Stream comprime com gzip os
  // eventos maiores (call.recording_ready, call.ended, stats_report_ready,
  // session_*) — os bytes gzip (magic 0x1f 0x8b) não são UTF-8 válido, então
  // .text() os destrói antes mesmo do SDK tentar descomprimir, e a
  // verificação de assinatura falha (401) só para esses eventos maiores.
  const rawBody = Buffer.from(await request.arrayBuffer());
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
  // `created_at` é tipado como `Date` pelo SDK, mas `verifyAndParseWebhook`
  // só faz `JSON.parse` (sem reviver) — em runtime é uma string ISO, não uma
  // instância de Date. `.toISOString()" direto quebrava com TypeError em
  // QUALQUER evento fora de `call.recording_ready` que trouxesse esse campo
  // (ou seja, quase todo evento real do Stream). `new Date(...)` aceita tanto
  // a string quanto uma Date de verdade, então cobre os dois casos.
  const genericEvent = event as { call_cid?: string; created_at?: Date | string };
  const eventId =
    event.type === "call.recording_ready"
      ? `${event.type}:${event.call_cid}:${event.egress_id}`
      : `${event.type}:${genericEvent.call_cid ?? "unknown"}:${genericEvent.created_at ? new Date(genericEvent.created_at).toISOString() : Date.now()}`;

  const isNew = await webhookEventService.recordIfNew("stream", eventId, event.type);
  if (!isNew) {
    // Reentrega do provedor — já processado, responde OK sem reprocessar.
    return new Response("OK", { status: 200 });
  }

  switch (event.type) {
    case "call.recording_ready": {
      const recordId = recordIdFromCallCid(event.call_cid);
      if (recordId && event.call_recording?.url) {
        // Import dinâmico: `classService` arrasta firebase-admin, Resend e
        // storage — peso que só vale a pena pagar nestes dois eventos, não
        // nos ~170 outros tipos que o Stream manda e que caem no `default`.
        // O Stream dispara vários eventos quase juntos ao fim de uma aula
        // (session_ended, stats_report_ready, call.ended...), forçando várias
        // invocações frias em paralelo; manter o caminho comum leve reduz a
        // chance de o cold start desses dois estourar o timeout do webhook.
        const { classService } = await import("@/modules/class/class.service");
        await classService.handleRecordingReady(recordId, event.call_recording.url);
      }
      break;
    }
    case "call.ended": {
      // Rede de segurança: se "Encerrar aula" falhou mas a call terminou
      // mesmo assim (ex: todos saíram), garante que completed vira true.
      const recordId = recordIdFromCallCid(event.call_cid);
      if (recordId) {
        const { classService } = await import("@/modules/class/class.service");
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
