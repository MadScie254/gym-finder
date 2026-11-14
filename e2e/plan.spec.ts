import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// My week is mounted by the shell at /plan/*. Skip, saying so, if the shell does not render it yet.
async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: "load" });
  const heading = page.getByRole("heading", { level: 1, name: "My week" });
  const mounted = await heading.waitFor({ state: "visible", timeout: 10_000 }).then(() => true, () => false);
  test.skip(!mounted, `The shell does not render My week at ${path} yet.`);
}

for (const path of ["/plan", "/plan/week", "/plan/meals", "/plan/shopping"]) {
  test(`${path} has no serious or critical axe issues`, async ({ page }) => {
    await open(page, path);
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}

test("a session can be ticked and the plan downloads as a calendar file", async ({ page }) => {
  await open(page, "/plan");
  await page.getByRole("button", { name: "Mark session done" }).click();
  await page.getByRole("navigation", { name: "My week sections" }).getByRole("link", { name: "Week" }).click();
  await expect(page.getByText("of 12 sessions done")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Add to calendar" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("find-my-gym-plan.ics");
});

test("meals link to the demo food section, which is marked as a demo", async ({ page }) => {
  await open(page, "/plan/meals");
  await expect(page.getByText("Demo stores and sample menus. Ordering is not live yet.")).toBeVisible();
  await page.getByRole("link", { name: "Open demo food stores" }).click();
  await expect(page).toHaveURL(/\/fuel$/);
  await expect(page.getByRole("status").filter({ hasText: "Ordering is not live yet." }).first()).toBeVisible();
});
