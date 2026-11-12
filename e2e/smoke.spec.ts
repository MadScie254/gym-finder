import { expect, test } from "@playwright/test";

// Map tiles stream for as long as the page is open, so never wait for networkidle.
test("a misspelled search finds Salute Gym and its detail offers a Call link", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  const search = page.getByRole("combobox", { name: /search gyms/i });
  await expect(search).toBeVisible();
  await search.fill("slaute gym");

  const first = page.getByRole("option").first();
  await expect(first).toBeVisible();
  await expect(first).toContainText("Salute Gym");
  await first.click();

  await expect(page).toHaveURL(/\/gym\/salute-gym/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Salute Gym");
  await expect(page.getByRole("combobox", { name: /search gyms/i })).toHaveCount(0);
  const call = page.locator('a[href^="tel:"]').first();
  await expect(call).toBeVisible();
  await expect(call).toHaveAttribute("href", /^tel:\+?\d{6,}/);
  await expect(page.getByRole("heading", { name: "Before you go" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How we know" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Directions" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
});
