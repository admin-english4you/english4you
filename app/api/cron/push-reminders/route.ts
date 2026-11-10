import { timingSafeEqual } from "node:crypto";
import { pushNotificationService } from "@/modules/push-notification/push-notification.service";
import { isReminderSlot } from "@/modules/push-notification/push-notification.copy";

/**
 * Disparo em massa dos lembretes de estudo — chamado pelo Vercel Cron 3x/dia
 * (ver `vercel.json`), um horário por chamada via `?slot=`.
 *
 * Sem HMAC nem tabela de idempotência (diferente dos webhooks do Mercado
 * Pago/Stream): o pior caso de um `CRON_SECRET` vazado é spam de lembrete,
 * não exposição de dado, e a checagem "já praticou hoje" do Service já evita
 * reenvio útil dentro do mesmo dia. A Vercel manda automaticamente
 * `Authorization: Bearer $CRON_SECRET` nas chamadas de cron quando essa env
 * var existe — não precisa configurar isso a mais em `vercel.json`.
 */
/** Comparação em tempo constante — `!==` vaza, pelo tempo de resposta, quantos caracteres do segredo batem. */
function isValidCronAuth(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authHeader) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authHeader);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function GET(request: Request) {
  if (!isValidCronAuth(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const slot = new URL(request.url).searchParams.get("slot");
  if (!isReminderSlot(slot)) {
    return new Response("Invalid or missing slot", { status: 400 });
  }

  const result = await pushNotificationService.sendDailyReminders(slot);
  console.log(`[push-reminders] slot=${slot} sent=${result.sent} skipped=${result.skipped} cleaned=${result.cleaned}`);

  return Response.json({ ok: true, slot, ...result });
}
