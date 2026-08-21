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
