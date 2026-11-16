// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Venue } from "../data/types";
import { t } from "../lib/i18n";
import { storeSaved, toggleSaved } from "../lib/saved";
import { click, mount, type Mounted } from "../ui/test-utils";
import { NAV_GROUPS } from "./nav";
import { Sidebar } from "./Sidebar";
import { StoreProvider } from "./stores";

const mocks = vi.hoisted(() => ({ canInstall: false, install: vi.fn(), offline: false }));

vi.mock("./venue-context", () => ({
  useVenueContext: () => ({ lang: "en", offline: mocks.offline, index: { manifest: { builtAt: "2026-11-11T14:19:21.136Z" } } }),
  useT: () => (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t("en", key, vars),
}));
vi.mock("./pwa", () => ({ usePwa: () => ({ canInstall: mocks.canInstall, install: mocks.install, updateReady: false, applyUpdate: vi.fn() }) }));

let ui: Mounted | undefined;
const entries = NAV_GROUPS.flatMap((group) => group.items);

beforeEach(() => {
  localStorage.clear();
  mocks.canInstall = false;
  mocks.offline = false;
  mocks.install.mockClear();
});

afterEach(async () => {
  await ui?.unmount();
  ui = undefined;
  Reflect.deleteProperty(navigator, "serviceWorker");
});

async function render(route = "/", props: { collapsed?: boolean; onToggle?: () => void } = {}) {
  ui = await mount(
    <StoreProvider><Sidebar collapsed={props.collapsed ?? false} onToggle={props.onToggle ?? (() => undefined)} /></StoreProvider>,
    { route },
  );
  return ui;
}

const nav = () => ui!.container.querySelector("nav[aria-label='Primary']")!;
const links = () => [...nav().querySelectorAll<HTMLAnchorElement>("a")];
const current = () => links().filter((link) => link.getAttribute("aria-current") === "page").map((link) => link.getAttribute("href"));
const venue = (id: string) => ({ id, slug: id, name: id, lat: -1.28, lng: 36.82, trust: { tier: "listed" } }) as unknown as Venue;

it("lists three labelled groups and ten pages in sidebar order, each with an icon", async () => {
  await render();
  const groups = [...nav().querySelectorAll("ul")].map((list) => document.getElementById(list.getAttribute("aria-labelledby") ?? "")?.textContent);
  expect(groups).toEqual(["Explore", "Plan", "Help"]);
  expect(links().map((link) => link.getAttribute("href"))).toEqual(entries.map((entry) => entry.to));
  links().forEach((link, i) => {
    expect(link.textContent).toContain(t("en", entries[i].labelKey));
    expect(link.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});

it("marks only the page the person is on", async () => {
  await render("/plan/meals");
  expect(current()).toEqual(["/plan/meals"]);
  await ui!.unmount();
  await render("/plan");
  expect(current()).toEqual(["/plan"]);
  await ui!.unmount();
  await render("/gym/salute-gym-1");
  expect(current()).toEqual(["/search"]);
});

it("shows how many gyms are saved", async () => {
  storeSaved([venue("a"), venue("b")].reduce((list, item) => toggleSaved(list, item), [] as ReturnType<typeof toggleSaved>));
  await render();
  const saved = links().find((link) => link.getAttribute("href") === "/saved")!;
  expect(saved.textContent).toContain("2");
  expect(saved.textContent).toContain("2 saved");
  expect(links().find((link) => link.getAttribute("href") === "/plan")!.textContent).not.toMatch(/\d/);
});

it("marks Order food as a demo and nothing else", async () => {
  await render();
  expect(links().filter((link) => link.textContent?.includes("Demo")).map((link) => link.getAttribute("href"))).toEqual(["/fuel"]);
});

it("has a collapse button that reports its state and asks the parent to toggle", async () => {
  const onToggle = vi.fn();
  await render("/", { onToggle });
  const button = () => ui!.container.querySelector<HTMLButtonElement>("button[aria-expanded]")!;
  expect(button().getAttribute("aria-expanded")).toBe("true");
  expect(button().getAttribute("aria-label")).toBe("Collapse the sidebar");
  await click(button());
  expect(onToggle).toHaveBeenCalledOnce();

  await ui!.unmount();
  await render("/", { collapsed: true, onToggle });
  expect(button().getAttribute("aria-expanded")).toBe("false");
  expect(button().getAttribute("aria-label")).toBe("Expand the sidebar");
});

it("keeps every page reachable by name when collapsed to a rail", async () => {
  await render("/", { collapsed: true });
  const aside = ui!.container.querySelector("aside")!;
  expect(aside.getAttribute("data-collapsed")).toBe("true");
  expect(links()).toHaveLength(entries.length);
  links().forEach((link, i) => {
    expect(link.textContent).toContain(t("en", entries[i].labelKey));
    expect(link.getAttribute("title")).toBe(t("en", entries[i].labelKey));
  });
  expect(nav().querySelectorAll("ul[aria-labelledby]")).toHaveLength(3);
});

it("says the gym list date, and says Works offline only once a service worker controls the page", async () => {
  await render();
  expect(ui!.container.textContent).toContain("Gym list from 11 Nov 2026");
  expect(ui!.container.textContent).not.toContain("Works offline");
  await ui!.unmount();

  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { controller: {}, addEventListener() {}, removeEventListener() {} } });
  await render();
  expect(ui!.container.textContent).toContain("Works offline");
});

it("offers Install only when the browser can install the app", async () => {
  await render();
  expect([...ui!.container.querySelectorAll("button")].some((button) => button.textContent?.includes("Install the app"))).toBe(false);
  await ui!.unmount();

  mocks.canInstall = true;
  await render();
  const install = [...ui!.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Install the app"))!;
  await click(install);
  expect(mocks.install).toHaveBeenCalledOnce();
});
