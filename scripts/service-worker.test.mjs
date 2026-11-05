import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { expect, it } from "vitest";

const source = readFileSync(fileURLToPath(new URL("../public/sw.js", import.meta.url)), "utf8");

function harness(fetcher = async () => { throw new Error("offline"); }) {
  const handlers = {};
  const stores = new Map();
  const key = (request) => typeof request === "string" ? request : request.url;
  const caches = {
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        addAll: async (urls) => { for (const url of urls) store.set(url, url === "/data/manifest.json"
          ? Response.json({ gymsPath: "/data/gyms.json" })
          : new Response("shell", { headers: { "Content-Type": "text/html" } })); },
        add: async (url) => { store.set(url, Response.json({ gyms: [] })); },
        match: async (request) => store.get(key(request)),
        put: async (request, response) => { store.set(key(request), response); },
      };
    },
    match: async (request) => {
      for (const store of stores.values()) if (store.has(key(request))) return store.get(key(request));
      return undefined;
    },
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
  };
  const self = {
    location: { origin: "https://example.test" },
    addEventListener: (name, listener) => { handlers[name] = listener; },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  vm.runInNewContext(source, { self, caches, fetch: fetcher, URL, Response, Request });
  async function dispatch(name, request) {
    const pending = [];
    let response;
    handlers[name]({
      request,
      respondWith: (promise) => { response = promise; },
      waitUntil: (promise) => pending.push(promise),
    });
    const resolved = response ? await response : undefined;
    await Promise.all(pending);
    return resolved;
  }
  return { dispatch, caches, stores };
}

it("returns a data error, not HTML, when uncached JSON is unavailable offline", async () => {
  const sw = harness();
  await sw.caches.open("fmg-shell-v1");
  sw.stores.get("fmg-shell-v1").set("/", new Response("<html>home</html>", { headers: { "Content-Type": "text/html" } }));
  const response = await sw.dispatch("fetch", new Request("https://example.test/data/gyms.json"));
  expect(response.status).toBe(503);
  expect(response.headers.get("Content-Type")).toContain("application/json");
});

it("does not cache unsuccessful responses", async () => {
  const sw = harness(async () => new Response("missing", { status: 404 }));
  const request = new Request("https://example.test/data/missing.json");
  const response = await sw.dispatch("fetch", request);
  expect(response.status).toBe(404);
  expect(await sw.caches.match(request)).toBeUndefined();
});

it("removes an obsolete cache on activation", async () => {
  const sw = harness();
  await sw.caches.open("fmg-shell-old");
  await sw.caches.open("fmg-shell-v1");
  await sw.dispatch("activate");
  expect(await sw.caches.keys()).not.toContain("fmg-shell-old");
});

it("pre-caches the current catalogue during installation for the first offline visit", async () => {
  const sw = harness();
  await sw.dispatch("install");
  const response = await sw.caches.match("/data/gyms.json");
  expect(response).toBeDefined();
  expect(await response.json()).toEqual({ gyms: [] });
});
