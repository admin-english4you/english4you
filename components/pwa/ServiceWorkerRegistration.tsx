"use client";

import { useEffect } from "react";

/**
 * Registra o service worker (`public/sw.js`) assim que o app carrega no
 * cliente. Necessário pros critérios de instalabilidade do PWA em alguns
 * navegadores (Chrome/Android) — o SW em si só faz cache leve de assets
 * estáticos, nunca de navegação ou chamadas de API (ver sw.js).
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[PWA] Falha ao registrar o service worker:", err);
    });
  }, []);

  return null;
}
