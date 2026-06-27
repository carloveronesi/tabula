// Service worker di Tabula — runtime caching dell'app shell per l'uso offline.
// Strategia: network-first per la navigazione (fallback alla shell in cache),
// stale-while-revalidate per gli asset same-origin. Nessuna dipendenza.
const CACHE = "tabula-v2";
// Base dello scope ricavata dalla posizione del SW (es. "/tabula/" su Pages,
// "/" in locale): l'app shell resta corretta a prescindere dal sottopercorso.
const BASE = self.location.pathname.replace(/sw\.js$/, "");
const APP_SHELL = [
  BASE,
  BASE + "index.html",
  BASE + "manifest.webmanifest",
  BASE + "tabula-mark.svg",
  BASE + "tabula-mark-maskable.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function store(request, response) {
  if (response && response.ok) {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (
    request.method !== "GET" ||
    new URL(request.url).origin !== self.location.origin
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => store(request, res))
        .catch(() =>
          caches.match(request).then((c) => c || caches.match(BASE + "index.html")),
        ),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => store(request, res))
        .catch(() => cached);
      return cached || network;
    }),
  );
});
