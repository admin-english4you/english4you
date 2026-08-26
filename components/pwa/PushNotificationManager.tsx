"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { subscribePushAction, unsubscribePushAction } from "@/modules/push-notification/push-notification.actions";

/**
 * Converte a chave pública VAPID (base64url) pro formato que
 * `pushManager.subscribe` espera — conversão padrão, igual ao guia oficial
 * de PWA do Next.js (node_modules/next/dist/docs/.../progressive-web-apps.md).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type Status = "checking" | "unsupported" | "subscribed" | "unsubscribed";

/**
 * Toggle de lembretes de estudo em `/student/profile`.
 *
 * O service worker já está registrado globalmente por `ServiceWorkerRegistration`
 * (montado em `app/layout.tsx`) — aqui só usamos `navigator.serviceWorker.ready`,
 * nunca `.register()` de novo.
 */
/** Calculado uma vez, no init preguiçoso do estado — não em efeito, pra não
 *  disparar um `setState` síncrono logo na primeira renderização. */
function checkSupport(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export function PushNotificationManager() {
  const [status, setStatus] = useState<Status>(() => (checkSupport() ? "checking" : "unsupported"));
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "checking") return;

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setStatus(subscription ? "subscribed" : "unsubscribed"))
      .catch(() => setStatus("unsubscribed"));
  }, [status]);

  const handleSubscribe = async () => {
    setError(null);
    setIsPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Você precisa permitir notificações no navegador pra ativar os lembretes.");
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setError("Lembretes indisponíveis no momento.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // `BufferSource` no lib.dom.d.ts recente exige `ArrayBuffer` estrito
        // (não `ArrayBufferLike`); em runtime é só um Uint8Array normal.
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const result = await subscribePushAction(subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
      if (result.success) {
        setStatus("subscribed");
      } else {
        setError(result.error);
        await subscription.unsubscribe();
      }
    } catch {
      setError("Não foi possível ativar os lembretes. Tente novamente.");
    } finally {
      setIsPending(false);
    }
  };

  const handleUnsubscribe = async () => {
    setError(null);
    setIsPending(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribePushAction({ endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch {
      setError("Não foi possível desativar os lembretes. Tente novamente.");
    } finally {
      setIsPending(false);
    }
  };

  // Sem suporte (Safari antigo, alguns navegadores mobile): sem espaço na
  // tela pra oferecer algo que não vai funcionar.
  if (status === "unsupported" || status === "checking") return null;

  const isSubscribed = status === "subscribed";

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
            isSubscribed
              ? "border-primary/20 bg-primary/10 text-primary"
              : "border-slate-200 bg-slate-50 text-slate-400"
          }`}
        >
          {isSubscribed ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle>Lembretes de estudo</CardTitle>
          <CardDescription>
            {isSubscribed
              ? "Você recebe notificações no aparelho pra não perder o dia de prática."
              : "Ative pra receber um empurrãozinho de manhã, à tarde e à noite nos dias que você ainda não praticou."}
          </CardDescription>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">{error}</p>
      )}

      <button
        type="button"
        onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
        disabled={isPending}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          isSubscribed
            ? "border border-slate-200 text-slate-600 hover:bg-slate-50"
            : "bg-primary text-primary-foreground hover:bg-primary/80"
        }`}
      >
        {isSubscribed ? (
          <>
            <BellOff className="h-4 w-4" /> Desativar lembretes
          </>
        ) : (
          <>
            <Bell className="h-4 w-4" /> {isPending ? "Ativando..." : "Ativar lembretes"}
          </>
        )}
      </button>
    </Card>
  );
}
