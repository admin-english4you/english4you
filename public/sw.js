const CACHE_NAME = "e4y-static-v1";
const PRECACHE_URLS = ["/icon-192.png", "/icon-512.png", "/apple-icon.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Só GET, e só assets estáticos (ícones/imagens/fontes) — nunca navegação
// (HTML) nem chamadas de API: a plataforma é autenticada e cheia de dados
// dinâmicos (aulas ao vivo, pagamentos, sessão), e servir uma resposta em
// cache pra essas rotas seria pior do que não ter service worker nenhum.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!/\.(png|jpg|jpeg|svg|ico|webp|woff2?)$/.test(url.pathname)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Lembretes de estudo (ver modules/push-notification). O payload é o
// PushPayload de lib/web-push.ts: { title, body, link }.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { link: data.link || "/student/practice" },
    })
  );
});

// Foca uma aba já aberta na rota do lembrete em vez de sempre abrir uma nova
// — evita empilhar abas toda vez que o aluno clica numa notificação.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/student/practice";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(link) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(link);
    })
  );
});
