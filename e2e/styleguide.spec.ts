import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The styleguide exists in dev and e2e builds only (vite build --mode e2e).
for (const theme of ["light", "dark"] as const) {
  test.describe(`styleguide, ${theme}`, () => {
    // Device scale 1: Chromium tiles very tall full-page captures badly at 2x.
    test.use({ colorScheme: theme, deviceScaleFactor: 1 });

    test("has no serious or critical axe issues", async ({ page }) => {
      await page.goto(`/styleguide?theme=${theme}`, { waitUntil: "load" });
      await expect(page.getByRole("heading", { level: 1, name: "Signwriter" })).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });

    test("screenshot for visual review", async ({ page }, info) => {
      const dir = process.env.STYLEGUIDE_SHOTS;
      test.skip(!dir, "Set STYLEGUIDE_SHOTS to a folder to save full-page screenshots.");
      await page.goto(`/styleguide?theme=${theme}`, { waitUntil: "load" });
      await expect(page.getByRole("heading", { level: 1, name: "Signwriter" })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${dir}/styleguide-${info.project.name}-${theme}.png`, fullPage: true });
    });
  });
}

test("search field works from the keyboard", async ({ page }) => {
  await page.goto("/styleguide", { waitUntil: "load" });
  const box = page.getByRole("combobox", { name: "Search gyms and areas" });
  await box.fill("lys");
  await expect(box).toHaveAttribute("aria-expanded", "true");
  await box.press("ArrowDown");
  await expect(page.getByRole("option", { name: /Lystra Gym And Spa/ })).toHaveAttribute("aria-selected", "true");
  await box.press("Enter");
  await expect(page.getByText("Picked Lystra Gym And Spa.")).toBeVisible();
});

test("sheet handle changes stops from the keyboard", async ({ page }) => {
  await page.goto("/styleguide", { waitUntil: "load" });
  const handle = page.getByRole("button", { name: /Resize Gyms near Umoja panel/ });
  await expect(handle).toHaveAccessibleName(/half open/);
  await handle.focus();
  await handle.press("ArrowUp");
  await expect(handle).toHaveAccessibleName(/fully open/);
  await handle.press("Home");
  await expect(handle).toHaveAccessibleName(/peeking/);
});
