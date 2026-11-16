// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Venue } from "../data/types";
import { t } from "../lib/i18n";
import { storeSaved, toggleSaved } from "../lib/saved";
import { click, mount, type Mounted } from "../ui/test-utils";
import { MenuContent } from "./MenuContent";
import { NAV_GROUPS } from "./nav";
import { StoreProvider } from "./stores";

const mocks = vi.hoisted(() => ({ lang: "en" as "en" | "sw", setLang: vi.fn(), openReport: vi.fn() }));

vi.mock("./venue-context", () => ({
  useVenueContext: () => ({ lang: mocks.lang, setLang: mocks.setLang }),
  useT: () => (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t("en", key, vars),
}));
vi.mock("../features/report/report-store", () => ({ useReport: () => ({ open: mocks.openReport }) }));

let ui: Mounted | undefined;
const entries = NAV_GROUPS.flatMap((group) => group.items);

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  mocks.lang = "en";
  mocks.setLang.mockClear();
  mocks.openReport.mockClear();
});
afterEach(async () => { await ui?.unmount(); ui = undefined; });

async function render(route = "/", props: { onNavigate?: () => void; onInstall?: () => void } = {}) {
  ui = await mount(
    <StoreProvider><MenuContent onNavigate={props.onNavigate ?? (() => undefined)} onInstall={props.onInstall} /></StoreProvider>,
    { route },
  );
  return ui;
}

const links = () => [...ui!.container.querySelectorAll<HTMLAnchorElement>("nav a")];
const buttonNamed = (text: string) => [...ui!.container.querySelectorAll("button")].find((button) => button.textContent?.includes(text))!;

it("lists every page in the three sidebar groups, so nothing is out of reach on a phone", async () => {
  await render();
  const nav = ui!.container.querySelector("nav")!;
  const groups = [...nav.querySelectorAll("ul")].map((list) => document.getElementById(list.getAttribute("aria-labelledby") ?? "")?.textContent);
  expect(groups).toEqual(["Explore", "Plan", "Help"]);
  expect(links().map((link) => link.getAttribute("href"))).toEqual(entries.map((entry) => entry.to));
  for (const name of ["Meals", "Shopping list", "Order food"]) {
    expect(links().some((link) => link.textContent?.includes(name)), name).toBe(true);
  }
});

it("marks the page the person is on, and Order food as a demo", async () => {
  await render("/plan/meals");
  expect(links().filter((link) => link.getAttribute("aria-current") === "page").map((link) => link.getAttribute("href"))).toEqual(["/plan/meals"]);
  expect(links().filter((link) => link.textContent?.includes("Demo")).map((link) => link.getAttribute("href"))).toEqual(["/fuel"]);
});

it("shows how many gyms are saved", async () => {
  const venue = (id: string) => ({ id, slug: id, name: id, lat: -1.28, lng: 36.82, trust: { tier: "listed" } }) as unknown as Venue;
  storeSaved([venue("a"), venue("b"), venue("c")].reduce((list, item) => toggleSaved(list, item), [] as ReturnType<typeof toggleSaved>));
  await render();
  expect(links().find((link) => link.getAttribute("href") === "/saved")!.textContent).toContain("3");
});

it("closes the menu when a page is chosen", async () => {
  const onNavigate = vi.fn();
  await render("/", { onNavigate });
  await click(links().find((link) => link.getAttribute("href") === "/plan/meals")!);
  expect(onNavigate).toHaveBeenCalledOnce();
});

it("switches language and keeps Kiswahili marked as a draft", async () => {
  await render();
  expect(buttonNamed("English").getAttribute("aria-pressed")).toBe("true");
  expect(ui!.container.textContent).not.toContain(t("en", "swahiliDraft"));
  await click(buttonNamed("Kiswahili"));
  expect(mocks.setLang).toHaveBeenCalledWith("sw");
  await ui!.unmount();

  mocks.lang = "sw";
  await render();
  expect(ui!.container.textContent).toContain(t("en", "swahiliDraft"));
});

it("sets the appearance and reports which one is on", async () => {
  await render();
  expect(buttonNamed("Match device").getAttribute("aria-pressed")).toBe("true");
  await click(buttonNamed("Dark"));
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(buttonNamed("Dark").getAttribute("aria-pressed")).toBe("true");
  expect(buttonNamed("Match device").getAttribute("aria-pressed")).toBe("false");
});

it("opens the missing-gym report and closes the menu", async () => {
  const onNavigate = vi.fn();
  await render("/", { onNavigate });
  await click(buttonNamed("Add a missing gym"));
  expect(mocks.openReport).toHaveBeenCalledWith("add_gym", null);
  expect(onNavigate).toHaveBeenCalledOnce();
});

it("offers Install only when the browser can install the app", async () => {
  await render();
  expect([...ui!.container.querySelectorAll("button")].some((button) => button.textContent?.includes("Install the app"))).toBe(false);
  await ui!.unmount();

  const onInstall = vi.fn();
  const onNavigate = vi.fn();
  await render("/", { onInstall, onNavigate });
  await click(buttonNamed("Install the app"));
  expect(onInstall).toHaveBeenCalledOnce();
  expect(onNavigate).toHaveBeenCalledOnce();
});
