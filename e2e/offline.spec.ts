import { expect, test } from "@playwright/test";

// Every other journey blocks the service worker. This one needs the real worker, because it checks
// that one online visit is enough for the app to open offline.
test.use({ serviceWorkers: "allow" });

test("after one visit a gym page and the list open offline, and say so", async ({ page, context }) => {
  await page.goto("/search", { waitUntil: "load" });
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });

  // The worker caches the built files as it installs. Wait until the page's own scripts and styles are in.
  await expect.poll(() => page.evaluate(async () => {
    const urls = [...document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>("script[src], link[rel=stylesheet]")]
      .map((element) => ("src" in element && element.src) || (element as HTMLLinkElement).href);
    const hits = await Promise.all(urls.map((url) => caches.match(url)));
    return urls.length > 0 && hits.every(Boolean);
  }), { timeout: 30_000 }).toBe(true);

  const card = page.getByRole("article").first();
  const name = (await card.getByRole("heading", { level: 2 }).innerText()).trim();
  const href = await card.getByRole("heading", { level: 2 }).getByRole("link").getAttribute("href");
  expect(href).toMatch(/^\/gym\//);

  await context.setOffline(true);

  // A page that was never opened: the worker answers with the cached app, which draws it from the cached list.
  await page.goto(href!, { waitUntil: "load" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page.getByText(/^Offline\. Showing the gym list from /)).toBeVisible();

  await page.goto("/search", { waitUntil: "load" });
  await expect(page.getByRole("article").first()).toBeVisible();
  await expect(page.getByText(/^Offline\. Showing the gym list from /)).toBeVisible();
});
