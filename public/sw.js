const CACHE = "gym-finder-v3";
const PRECACHE = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];
const MAX_RUNTIME_ENTRIES = 120;

async function precacheAppShell() {
  const cache = await caches.open(CACHE);
  await Promise.all(
    PRECACHE.map(async (url) => {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (response.ok) await cache.put(url, response);
      } catch {
        // A partial install is still useful; runtime requests remain network-first.
      }
    }),
  );

  try {
    const response = await fetch("/", { cache: "no-store" });
    if (!response.ok) return;
    const html = await response.clone().text();
    await cache.put("/", response);
    const assets = [
      ...new Set(
        [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
          .map((match) => match[1])
          .filter((url) => url.startsWith("/_next/static/")),
      ),
    ];
    await Promise.all(
      assets.map(async (url) => {
        try {
          const asset = await fetch(url, { cache: "no-store" });
          if (asset.ok) await cache.put(url, asset);
        } catch {
          // Runtime caching can recover an individual asset later.
        }
      }),
    );
  } catch {
    // Installation must not brick the online application.
  }
}

async function cacheRuntime(request, response) {
  const cache = await caches.open(CACHE);
  await cache.put(request, response);
  const keys = await cache.keys();
  await Promise.all(
    keys.slice(0, Math.max(0, keys.length - MAX_RUNTIME_ENTRIES)).map((key) => cache.delete(key)),
  );
}

self.addEventListener("install", (event) => {
  // Let an active session finish with its current asset set. The new worker
  // activates when it is safe to do so.
  event.waitUntil(precacheAppShell());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  if (!new Set(["font", "image", "script", "style", "worker"]).has(request.destination)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            void cacheRuntime(request, copy).catch(() => undefined);
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetched;
    }),
  );
});
