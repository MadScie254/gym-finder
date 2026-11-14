// @vitest-environment jsdom
// Hard rule (docs/REVAMP_PLAN.md 2.1): every simulated screen shows the Demo marker.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Route, Routes } from "react-router";
import { mount, type Mounted } from "../../ui/test-utils";
import FuelRoutes from "./index";
import { DEMO_STORES } from "./data";
import { FUEL_STORAGE_KEY, resetFuelStore } from "./fuelStore";

const DEMO_LINE = "Demo stores and sample menus. Ordering is not live yet.";
const store = DEMO_STORES[0];
const order = {
  id: "demo-test", storeId: store.id, storeName: store.name, placedAt: "2026-11-16T17:00:00.000Z",
  lines: [{ itemId: store.items[0].id, name: store.items[0].name, unit: store.items[0].unit, qty: 1, priceKes: store.items[0].priceKes }],
  totalKes: store.items[0].priceKes,
};

function seed(state: unknown) {
  window.localStorage.setItem(FUEL_STORAGE_KEY, JSON.stringify(state));
  resetFuelStore();
}

async function render(path: string, mode?: "demo" | "live"): Promise<Mounted> {
  return mount(
    <Routes><Route path="/fuel/*" element={<FuelRoutes mode={mode} />} /></Routes>,
    { route: path },
  );
}

function hasDemoMarker(container: HTMLElement): boolean {
  const tag = [...container.querySelectorAll("span")].some((el) => el.textContent?.startsWith("Demo,") && el.textContent.includes("sample data"));
  return tag && (container.textContent ?? "").includes(DEMO_LINE);
}

let view: Mounted | null = null;
beforeEach(() => { window.localStorage.clear(); resetFuelStore(); });
afterEach(async () => { await view?.unmount(); view = null; });

const SCREENS: Array<{ name: string; path: string; state?: unknown }> = [
  { name: "home", path: "/fuel" },
  { name: "store", path: `/fuel/store/${store.id}` },
  { name: "store, focused item", path: `/fuel/store/${store.id}?item=${store.items[1].id}` },
  { name: "unknown store", path: "/fuel/store/nope" },
  { name: "empty basket", path: "/fuel/basket" },
  { name: "basket", path: "/fuel/basket", state: { basket: { storeId: store.id, lines: [{ itemId: store.items[0].id, qty: 2 }] }, orders: [] } },
  { name: "confirmation", path: `/fuel/order/${order.id}`, state: { basket: null, orders: [order] } },
  { name: "missing order", path: "/fuel/order/gone" },
  { name: "demo orders", path: "/fuel/orders", state: { basket: null, orders: [order] } },
  { name: "no demo orders", path: "/fuel/orders" },
  { name: "unknown path", path: "/fuel/anything" },
];

describe("demo marker", () => {
  for (const screen of SCREENS) {
    it(`is on the ${screen.name} screen`, async () => {
      if (screen.state) seed(screen.state);
      view = await render(screen.path);
      expect(view.container.querySelector('[data-fuel-content="simulated"]')).not.toBeNull();
      expect(hasDemoMarker(view.container)).toBe(true);
    });
  }

  it("only the live-mode screens may opt out", () => {
    const dir = __dirname;
    const optOuts = readdirSync(dir).filter((file) => file.endsWith(".tsx") && !file.endsWith(".test.tsx"))
      .filter((file) => readFileSync(join(dir, file), "utf8").includes('content="real"'));
    expect(optOuts).toEqual(["index.tsx"]);
    const index = readFileSync(join(dir, "index.tsx"), "utf8");
    expect(index.match(/content="real"/g)).toHaveLength(2);
  });
});

describe("demo honesty", () => {
  it("says what a demo order is, and that nothing was sent", async () => {
    seed({ basket: null, orders: [order] });
    view = await render(`/fuel/order/${order.id}`);
    expect(view.container.textContent).toContain("Demo order saved on this device. Nothing was sent to a store.");
  });

  it("labels prices as samples and links to real services only as plain link-outs", async () => {
    view = await render("/fuel");
    const text = view.container.textContent ?? "";
    expect(text).toContain("sample");
    expect(text).toContain("Find My Gym is not affiliated with Glovo or Chandarana Foodplus.");
    const links = [...view.container.querySelectorAll<HTMLAnchorElement>("a[href^='https://']")].map((a) => [a.textContent, a.href, a.target]);
    expect(links).toEqual(expect.arrayContaining([
      [expect.stringContaining("Open Glovo"), "https://glovoapp.com/en/ke", "_blank"],
      [expect.stringContaining("Open Chandarana Foodplus"), "https://foodplus.co.ke/", "_blank"],
    ]));
    expect(view.container.querySelector("img")).toBeNull();
  });

  it("shows store pages as sample locations", async () => {
    view = await render(`/fuel/store/${store.id}`);
    expect(view.container.textContent).toContain("There is no store here.");
    expect(view.container.textContent).toContain("Sample hours");
  });

  it("shows no demo stores in live mode with no live services", async () => {
    view = await render("/fuel", "live");
    const text = view.container.textContent ?? "";
    expect(text).toContain("No live food services yet");
    expect(text).not.toContain("Demo:");
    expect(text).not.toContain(DEMO_LINE);
  });
});
