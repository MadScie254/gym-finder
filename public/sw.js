// scripts/precache.mjs fills in BUILD and PRECACHE after the build: the hashed script, style and font
// files, so the app also starts offline after one visit. Without them a first visit caches only the
// page, because the worker takes control after the page's own files have loaded.
const BUILD = "dev";
const PRECACHE = [];
const CACHE = `fmg-shell-${BUILD}`;
const SHELL = ["/", "/index.html", "/data/manifest.json", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    const manifest = await (await cache.match("/data/manifest.json")).json();
    if (!/^\/data\/[a-zA-Z0-9._/-]+\.json$/.test(manifest.gymsPath) || manifest.gymsPath.includes("..")) {
      throw new Error("Invalid catalogue path");
    }
    await cache.add(manifest.gymsPath);
    // Best effort: one missing file must not stop the worker installing.
    await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("fmg-shell-") && name !== CACHE).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => undefined));
        }
        return response;
      })
      .catch(async () => {
        // ignoreVary: some hosts send "Vary: Origin", and a script request carries an Origin the precache request did not.
        const cached = await caches.match(event.request, { ignoreVary: true });
        if (cached) return cached;
        if (event.request.mode === "navigate") return await caches.match("/", { ignoreVary: true }) || new Response("Offline", { status: 503 });
        if (url.pathname.startsWith("/data/")) {
          return Response.json({ error: "Catalogue unavailable offline" }, { status: 503 });
        }
        return new Response("Offline", { status: 503 });
      }),
  );
});
