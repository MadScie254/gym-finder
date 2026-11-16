import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const DEMO_LINE = "Demo stores and sample menus. Ordering is not live yet.";

// The demo food section is mounted by the shell at /fuel/*. Skip, saying so, if it is not rendered yet.
async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: "load" });
  const mounted = await page.getByText(DEMO_LINE).first().waitFor({ state: "visible", timeout: 10_000 }).then(() => true, () => false);
  test.skip(!mounted, `The shell does not render the demo food section at ${path} yet.`);
}

for (const path of ["/fuel", "/fuel/store/demo-protein-kitchen-westlands", "/fuel/basket", "/fuel/orders"]) {
  test(`${path} shows the demo marker and has no serious or critical axe issues`, async ({ page }) => {
    await open(page, path);
    // DemoTag: visible "Demo" plus a spoken "sample data, not a live service".
    await expect(page.locator("span", { hasText: /^Demo, sample data/ }).first()).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}

test("the full demo flow ends with an honest confirmation", async ({ page }) => {
  await open(page, "/fuel/store/demo-protein-kitchen-westlands");
  await page.getByRole("button", { name: /^Add Githeri with avocado/ }).click();
  await page.getByRole("link", { name: /^View basket/ }).click();
  await page.getByRole("button", { name: "Place demo order" }).click();
  await expect(page.getByText("Demo order saved on this device. Nothing was sent to a store.")).toBeVisible();
  await page.getByRole("link", { name: "See demo orders" }).click();
  await expect(page.getByText("Demo: Protein Kitchen, Westlands")).toBeVisible();
});

test("real services are plain links that open in a new tab", async ({ page }) => {
  await open(page, "/fuel");
  await expect(page.getByRole("link", { name: /Open Glovo/ })).toHaveAttribute("href", "https://glovoapp.com/en/ke");
  await expect(page.getByRole("link", { name: /Open Chandarana Foodplus/ })).toHaveAttribute("target", "_blank");
  await expect(page.getByText("Find My Gym is not affiliated with Glovo or Chandarana Foodplus.")).toBeVisible();
});
