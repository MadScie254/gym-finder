import { expect, test } from "@playwright/test";

test("the production map finishes loading and draws gym layers", async ({ page }, testInfo) => {
  await page.goto("/", { waitUntil: "load" });
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Map", exact: true }).click();
  }
  const map = page.getByRole("region", { name: "Map of gyms" });
  await expect(map).toBeVisible();
  await expect(map).toHaveAttribute("data-ready", "true", { timeout: 20_000 });
});
