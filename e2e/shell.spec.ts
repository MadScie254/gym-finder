import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Map tiles stream for as long as a map page is open, so never wait for networkidle.

const PALETTE = "[data-palette]";
const paletteField = (page: Page) => page.getByRole("combobox", { name: /search gyms, places or type an action|tafuta gym, mahali au andika kitendo/i });

async function blockingAxeIssues(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`);
}

/** Text of every sidebar entry and palette row part that is cut off by its box. Screen-reader-only text is clipped on purpose. */
async function truncated(page: Page): Promise<string[]> {
  return page.evaluate(() => [...document.querySelectorAll("aside nav a span:not(.sr-only), [data-palette] [role='option'] span:not(.sr-only)")]
    .filter((node) => node.scrollWidth > node.clientWidth)
    .map((node) => node.textContent ?? ""));
}

test.describe("desktop shell", () => {
  test.beforeEach(({ isMobile }) => { test.skip(isMobile, "The sidebar is a desktop layout."); });

  test("the sidebar groups every page and marks the current one", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav).toBeVisible();
    for (const group of ["Explore", "Plan", "Help"]) await expect(nav.getByRole("list", { name: group })).toBeVisible();
    await expect(nav.getByRole("link")).toHaveCount(10);
    await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");

    await nav.getByRole("link", { name: "Find gyms" }).click();
    await expect(page).toHaveURL(/\/search$/);
    await expect(nav.getByRole("link", { name: "Find gyms" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("banner")).toContainText("Find gyms");

    await nav.getByRole("link", { name: "Meals" }).click();
    await expect(nav.getByRole("link", { name: "Meals" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "My week" })).not.toHaveAttribute("aria-current", "page");
  });

  test("the sidebar collapses to a rail and stays reachable by name", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await page.getByRole("button", { name: "Collapse the sidebar" }).click();
    await expect(page.locator("aside")).toHaveAttribute("data-collapsed", "true");
    await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Find gyms" })).toBeVisible();
    await page.reload({ waitUntil: "load" });
    await expect(page.locator("aside")).toHaveAttribute("data-collapsed", "true");
    await page.getByRole("button", { name: "Expand the sidebar" }).click();
    await expect(page.locator("aside")).not.toHaveAttribute("data-collapsed", "true");
  });

  test("Control K opens the quick actions and a typo still finds Salute Gym", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await page.keyboard.press("Control+k");
    await expect(page.locator(PALETTE)).toBeVisible();
    await paletteField(page).fill("slaute");
    await expect(page.getByRole("option").first()).toContainText("Salute Gym");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/gym\/salute-gym-/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Salute Gym");
    await expect(page.locator(PALETTE)).toHaveCount(0);
  });

  test("the widget opens the quick actions, and Escape closes them and returns focus to the widget", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const widget = page.getByRole("button", { name: /search gyms, places, actions/i });
    await widget.click();
    await expect(page.locator(PALETTE)).toBeVisible();
    await expect(paletteField(page)).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.locator(PALETTE)).toHaveCount(0);
    await expect(widget).toBeFocused();
  });

  test("scroll keys move the page on a fresh load and after a click in the sidebar", async ({ page }) => {
    await page.goto("/about/data", { waitUntil: "load" });
    const top = () => page.locator("#main").evaluate((node) => node.scrollTop);
    // The page loads on demand: wait until there is something to scroll.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect.poll(() => page.locator("#main").evaluate((node) => node.scrollHeight - node.clientHeight)).toBeGreaterThan(200);
    expect(await top()).toBe(0);

    await page.keyboard.press("PageDown");
    await expect.poll(top).toBeGreaterThan(0);
    await page.keyboard.press("Home");
    await expect.poll(top).toBe(0);

    // Focus is on the sidebar link after a click, outside the page area. The page must still scroll.
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.keyboard.press("PageDown");
    await expect.poll(top).toBeGreaterThan(0);
    const afterPageDown = await top();
    await page.keyboard.press("End");
    await expect.poll(top).toBeGreaterThan(afterPageDown);
    await page.keyboard.press("ArrowUp");
    await expect.poll(top).toBeLessThan((await top()) + 1);

    // Space on a focused sidebar link or button must keep its own meaning, not scroll.
    await page.getByRole("button", { name: "Collapse the sidebar" }).focus();
    await page.keyboard.press("Space");
    await expect(page.locator("aside")).toHaveAttribute("data-collapsed", "true");
  });

  test("Back returns the page to where it was left, and a new page starts at the top", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const top = () => page.locator("#main").evaluate((node) => node.scrollTop);
    await page.locator("#main").evaluate((node) => { node.scrollTop = 600; });
    await expect.poll(top).toBe(600);

    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Help and about the data" }).click();
    await expect(page).toHaveURL(/\/about\/data$/);
    await expect.poll(top).toBe(0);

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect.poll(top).toBeGreaterThan(500);

    await page.goForward();
    await expect(page).toHaveURL(/\/about\/data$/);
    await expect.poll(top).toBe(0);
  });

  test("the appearance chosen in the quick actions shows on the top bar button", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await expect(page.getByRole("button", { name: "Appearance: Match device" })).toBeVisible();
    await page.keyboard.press("Control+k");
    await page.getByRole("option", { name: /Appearance: Match device/ }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.getByRole("button", { name: "Appearance: Light" })).toBeVisible();
    await page.getByRole("button", { name: "Appearance: Light" }).click();
    await expect(page.getByRole("button", { name: "Appearance: Dark" })).toBeVisible();
  });

  test("typing an action and pressing Enter does the action, not a fuzzy-matched gym", async ({ page }) => {
    await page.goto("/search", { waitUntil: "load" });
    await page.keyboard.press("Control+k");
    await paletteField(page).fill("set up my week");
    await expect(page.getByRole("option").first()).toContainText("Set up my week");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/plan\/setup$/);
  });

  for (const path of ["/", "/search"]) {
    test(`has no serious accessibility issues on ${path}, with the quick actions open`, async ({ page }) => {
      await page.goto(path, { waitUntil: "load" });
      expect(await blockingAxeIssues(page)).toEqual([]);
      await page.keyboard.press("Control+k");
      await paletteField(page).fill("gym");
      await expect(page.getByRole("option").first()).toBeVisible();
      expect(await blockingAxeIssues(page)).toEqual([]);
    });
  }
});

test.describe("phone shell", () => {
  test.beforeEach(({ isMobile }) => { test.skip(!isMobile, "Bottom tabs and the sheet are the phone layout."); });

  test("keeps the bottom tabs, has no sidebar, and the header Search button opens a full-height sheet", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await expect(page.locator("aside")).toHaveCount(0);
    await expect(page.locator("nav[aria-label='Primary'][data-placement='bottom']")).toBeVisible();

    await page.getByRole("banner").getByRole("button", { name: "Search" }).click();
    const sheet = page.locator(PALETTE);
    await expect(sheet).toHaveAttribute("data-variant", "sheet");
    const box = await sheet.boundingBox();
    expect(box?.width).toBe(390);
    expect(box?.height).toBeGreaterThanOrEqual(840);
    await expect(page.getByRole("option").first()).toBeVisible();

    await page.getByRole("button", { name: "Close quick actions" }).click();
    await expect(sheet).toHaveCount(0);

    await page.getByRole("banner").getByRole("button", { name: "Search" }).click();
    await expect(sheet).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
  });

  test("More opens every page: Meals, Shopping list and Order food are one tap away", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const tabs = page.locator("nav[aria-label='Primary'][data-placement='bottom']");
    await expect(page.getByRole("banner").getByRole("button", { name: "Menu" })).toHaveCount(0);

    await tabs.getByRole("button", { name: "More" }).click();
    const sheet = page.getByRole("dialog", { name: "Menu" });
    await expect(sheet).toBeVisible();
    for (const name of ["Home", "Find gyms", "Saved", "My week", "Meals", "Shopping list", "Order food", "My reports", "Help and about the data", "Data and privacy"]) {
      await expect(sheet.getByRole("link", { name })).toBeVisible();
    }

    await sheet.getByRole("link", { name: "Meals" }).click();
    await expect(page).toHaveURL(/\/plan\/meals$/);
    await expect(sheet).toHaveCount(0);
    await expect(page.locator("#main")).toBeFocused();

    await tabs.getByRole("button", { name: "More" }).click();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: /^Order food/ }).click();
    await expect(page).toHaveURL(/\/fuel$/);
  });

  test("More marks the page you are on, is the current tab on pages outside the four, and takes focus back when dismissed", async ({ page }) => {
    await page.goto("/reports", { waitUntil: "load" });
    const more = page.locator("nav[aria-label='Primary'][data-placement='bottom']").getByRole("button", { name: "More" });
    await expect(more).toHaveAttribute("data-current", "true");
    await more.click();
    await expect(page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "My reports" })).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
    await expect(more).toBeFocused();
  });

  test("has no serious accessibility issues with More open", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await page.locator("nav[aria-label='Primary'][data-placement='bottom']").getByRole("button", { name: "More" }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
    expect(await blockingAxeIssues(page)).toEqual([]);
  });

  test("a typed search opens a gym from the sheet", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await page.getByRole("banner").getByRole("button", { name: "Search" }).click();
    await paletteField(page).fill("slaute");
    await page.getByRole("option").first().click();
    await expect(page).toHaveURL(/\/gym\/salute-gym-/);
  });
});

test.describe("Kiswahili", () => {
  test("no sidebar entry or quick-action row is cut off", async ({ page, isMobile }) => {
    await page.goto("/", { waitUntil: "load" });
    if (isMobile) {
      await page.getByRole("button", { name: "More" }).click();
      await page.getByRole("button", { name: "Kiswahili" }).click();
      await page.keyboard.press("Escape");
    } else {
      await page.getByRole("button", { name: /switch to kiswahili/i }).click();
      await expect(page.locator("aside")).toContainText("Gundua");
      // Kiswahili stays marked as a draft: the sidebar layout has no menu to carry the note.
      await expect(page.getByRole("banner").getByText("Rasimu", { exact: true })).toBeVisible();
      expect(await truncated(page)).toEqual([]);
    }

    if (isMobile) await page.getByRole("banner").getByRole("button", { name: "Tafuta" }).click();
    else await page.keyboard.press("Control+k");
    await expect(page.locator(PALETTE)).toBeVisible();
    await expect(page.getByRole("option").first()).toBeVisible();
    expect(await truncated(page)).toEqual([]);

    await paletteField(page).fill("wiki");
    await expect(page.getByRole("option").first()).toBeVisible();
    expect(await truncated(page)).toEqual([]);
  });
});
