// Service worker mínimo — existe principalmente pra tornar o app instalável
// como PWA. Não cacheia páginas nem respostas de API: este é um app
// orientado a dados (auth + formulários via Supabase), então cache de
// HTML/JSON desatualizado causaria tela com dado errado ou sessão quebrada.
// Só o "app shell" estático (ícones) fica em cache, como reforço de rede
// instável — o resto sempre vai pra rede primeiro.
const CACHE_NAME = "autosave-shell-v1";
const APP_SHELL = ["/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});
