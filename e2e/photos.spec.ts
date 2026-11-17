import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator } from "@playwright/test";

/** True once the browser has decoded the picture, so a file that 404s or is not a picture fails here. */
async function loaded(image: Locator) {
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
}

test("the home page opens with a picture, loaded first, and does not scroll sideways", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  const poster = page.locator("section[data-photo]").first();
  const image = poster.locator("img");
  await expect(image).toHaveAttribute("src", /^\/photos\/treadmills-\d+-[0-9a-f]{8}\.webp$/);
  await expect(image).toHaveAttribute("fetchpriority", "high");
  await expect(image).toHaveAttribute("alt", "");
  await loaded(image);
  await expect(poster.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("Today is a poster: a picture, a tab that says when, and the session on a board", async ({ page }) => {
  await page.goto("/plan", { waitUntil: "load" });
  const poster = page.locator("section[data-photo]").first();
  await expect(poster.getByRole("heading", { level: 2 })).toHaveText(/Full body A|Full body B|Steady cardio/);
  // The tab says when the session is: Today on a training day, otherwise the next or the still-open one.
  await expect(poster.getByText(/^(Today|Next: \w+|Still open from \w+)$/)).toBeVisible();
  await loaded(poster.locator("img"));
  // The tab is the only lettering across the picture: the heading is on the board below it.
  const picture = await poster.locator("img").boundingBox();
  const heading = await poster.getByRole("heading", { level: 2 }).boundingBox();
  expect(heading!.y).toBeGreaterThanOrEqual(picture!.y + picture!.height);
});

test("on Meals only today's menu is a poster, and it is marked as the current date", async ({ page }) => {
  await page.goto("/plan/meals", { waitUntil: "load" });
  const today = page.locator('li[aria-current="date"]');
  await expect(today).toHaveCount(1);
  await expect(today.getByText("Today", { exact: true })).toBeVisible();
  await loaded(today.locator("img"));
  await expect(page.locator("li img")).toHaveCount(1);
});

test("Order food shows its picture as decoration and nothing that pictures a store", async ({ page }) => {
  await page.goto("/fuel", { waitUntil: "load" });
  const images = page.locator("main img");
  await expect(images.first()).toBeVisible();
  for (const image of await images.all()) {
    await expect(image).toHaveAttribute("src", /^\/photos\//);
    await expect(image).toHaveAttribute("alt", "");
  }
  const store = page.getByRole("link", { name: /Demo|Chandarana|Glovo/ }).first();
  await expect(store).toBeVisible();
});

test("the About page credits every picture and links to its page", async ({ page }) => {
  await page.goto("/about/data", { waitUntil: "load" });
  await expect(page.getByRole("heading", { level: 2, name: "Pictures" })).toBeVisible();
  const links = page.getByRole("list").filter({ has: page.getByRole("link", { name: /, by / }) }).getByRole("link");
  await expect(links).toHaveCount(6);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute("href", /^https:\/\/www\.pexels\.com\/photo\//);
    await expect(link).toHaveAttribute("rel", /noopener/);
  }
  await expect(page.getByRole("link", { name: /Pexels License/ })).toHaveAttribute("href", "https://www.pexels.com/license/");
});

for (const path of ["/", "/plan/meals", "/fuel", "/about/data"]) {
  test(`${path} has no serious or critical axe issues with its pictures`, async ({ page }) => {
    await page.goto(path, { waitUntil: "load" });
    // The About page lists credits as text. The others carry a picture.
    if (path !== "/about/data") await expect(page.locator("main img, section img").first()).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}
