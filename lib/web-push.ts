import webpush from "web-push";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

const configured = Boolean(publicKey && privateKey);

if (configured) {
  webpush.setVapidDetails("mailto:suporte@english4you.com.br", publicKey!, privateKey!);
}

export interface PushSubscriptionKeys {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushPayload {
  title: string;
  body: string;
  /** Rota que o app abre/foca ao clicar na notificação — ver `public/sw.js`. */
  link: string;
}

export interface PushSendResult {
  ok: boolean;
  /** `true` quando o push service respondeu 404/410 — o endpoint morreu, a
   *  inscrição precisa ser apagada (o navegador nunca vai avisar sozinho). */
  gone: boolean;
}

/**
 * Envia uma notificação Web Push. Espelha o formato de `lib/resend.ts`:
 * singleton nulável guardado por env var ausente, nunca lança — quem chama
 * (o cron de lembretes) processa uma lista inteira e não pode deixar UM
 * envio ruim derrubar o resto.
 */
export async function sendPushNotification(
  subscription: PushSubscriptionKeys,
  payload: PushPayload
): Promise<PushSendResult> {
  if (!configured) {
    console.warn("[WebPush] NEXT_PUBLIC_VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não configuradas em .env.local");
    return { ok: false, gone: false };
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true, gone: false };
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number })?.statusCode;
    const gone = statusCode === 404 || statusCode === 410;
    if (!gone) {
      console.error("[WebPush] Falha ao enviar notificação:", error);
    }
    return { ok: false, gone };
  }
}
