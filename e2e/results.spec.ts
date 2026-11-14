import { expect, test } from "@playwright/test";

test("a gym card can be saved and added to comparison", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  const card = page.locator(".result-list article").first();
  await expect(card.getByRole("heading", { level: 2 })).toBeVisible();
  const name = await card.getByRole("heading", { level: 2 }).innerText();

  await card.getByRole("button", { name: "Save" }).click();
  await expect(card.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");
  await card.getByRole("button", { name: "Compare" }).click();
  await expect(card.getByRole("button", { name: "Added" })).toHaveAttribute("aria-pressed", "true");

  await page.goto("/saved", { waitUntil: "load" });
  await expect(page.getByRole("link", { name })).toBeVisible();
});
