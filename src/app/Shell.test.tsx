// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { t } from "../lib/i18n";
import { loadSidebarCollapsed, saveSidebarCollapsed } from "../lib/storage";
import { Shell } from "./Shell";
import { StoreProvider } from "./stores";

const state = vi.hoisted(() => ({ offline: false, lang: "en" as "en" | "sw", show: vi.fn(), locate: vi.fn(), setLang: vi.fn() }));

vi.mock("./venue-context", () => ({
  useVenueContext: () => ({
    lang: state.lang, offline: state.offline, index: { manifest: { builtAt: "2026-11-11T14:19:21.136Z" } }, setLang: state.setLang, locate: state.locate,
  }),
  useT: () => (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t("en", key, vars),
}));
vi.mock("../features/report/report-store", () => ({ useReport: () => ({ open: vi.fn() }) }));
vi.mock("../features/palette/palette-context", () => ({
  usePalette: () => ({ open: false, show: state.show, hide: vi.fn() }),
  preloadPalette: vi.fn(),
}));

let container: HTMLDivElement;
let root: Root;

/** Pretend the window is this wide: every `(min-width: Npx)` query answers for it. */
function viewport(width: number) {
  vi.stubGlobal("matchMedia", (query: string) => {
    const min = /min-width:\s*(\d+)px/.exec(query)?.[1];
    return { matches: min ? width >= Number(min) : false, media: query, addEventListener() {}, removeEventListener() {} };
  });
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  state.show.mockClear();
  state.locate.mockClear();
  state.setLang.mockClear();
  viewport(390);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  state.offline = false;
  state.lang = "en";
});

async function render(path: string) {
  await act(async () => root.render(
    <StoreProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route element={<Shell />}><Route path="*" element={<><p>Page body</p><button type="button">Inside the page</button></>} /></Route></Routes>
      </MemoryRouter>
    </StoreProvider>,
  ));
}

const primaryNavs = () => [...container.querySelectorAll("nav[aria-label='Primary']")];
const sidebar = () => container.querySelector<HTMLElement>("aside");
const named = (label: string) => container.querySelector<HTMLButtonElement>(`button[aria-label='${label}']`);
const press = (button: Element | null) => act(async () => { (button as HTMLElement).click(); });

it("has the four primary sections and marks Find gyms on discovery pages", async () => {
  await render("/in/kisumu");
  const links = [...container.querySelectorAll("nav[aria-label='Primary'] a")];
  expect(links.map((link) => link.textContent)).toEqual(["Home", "Find gyms", "Saved", "My week"]);
  expect(container.querySelector("a[aria-current='page']")?.textContent).toBe("Find gyms");
  expect(container.textContent).not.toContain("Fuel");
  expect(container.textContent).toContain("Page body");
});

it("says when it is offline and from which date the list is", async () => {
  state.offline = true;
  await render("/");
  expect(container.textContent).toContain("Offline. Showing the gym list from 11 Nov 2026.");
});

it("on a phone keeps the bottom tabs and adds a Search button to the header", async () => {
  await render("/");
  expect(sidebar()).toBeNull();
  expect(primaryNavs()).toHaveLength(1);
  expect(primaryNavs()[0].getAttribute("data-placement")).toBe("bottom");
  await press(container.querySelector("header button[aria-label='Search']"));
  expect(state.show).toHaveBeenCalledOnce();
});

it("from 900 to 1099 px keeps today's top navigation and adds a Search button", async () => {
  viewport(1000);
  await render("/");
  expect(sidebar()).toBeNull();
  expect(primaryNavs()).toHaveLength(1);
  expect(primaryNavs()[0].getAttribute("data-placement")).toBe("top");
  expect(container.querySelector("header nav[aria-label='Primary']")).not.toBeNull();
  await press(container.querySelector("header button[aria-label='Search']"));
  expect(state.show).toHaveBeenCalledOnce();
});

it("from 1100 px shows the sidebar and the top bar with the quick-actions widget, and no bottom tabs", async () => {
  viewport(1440);
  await render("/in/kisumu");
  expect(sidebar()).not.toBeNull();
  expect(primaryNavs()).toHaveLength(1);
  expect(sidebar()!.contains(primaryNavs()[0])).toBe(true);
  expect(primaryNavs()[0].querySelectorAll("a")).toHaveLength(10);
  expect(container.querySelector("header")?.textContent).toContain("Find gyms");
  expect(container.textContent).toContain("Page body");

  const widget = [...container.querySelectorAll("header button")].find((button) => button.textContent?.includes("Search gyms, places, actions"))!;
  expect(widget.textContent).toContain("Ctrl K");
  await press(widget);
  expect(state.show).toHaveBeenCalledOnce();
});

it("is a rail from 1100 to 1279 px and expanded from 1280 px until the person chooses", async () => {
  viewport(1200);
  await render("/");
  expect(sidebar()?.getAttribute("data-collapsed")).toBe("true");
  await act(async () => root.unmount());
  root = createRoot(container);

  viewport(1440);
  await render("/");
  expect(sidebar()?.hasAttribute("data-collapsed")).toBe(false);
});

it("keeps a saved choice at any width", async () => {
  saveSidebarCollapsed(false);
  viewport(1200);
  await render("/");
  expect(sidebar()?.hasAttribute("data-collapsed")).toBe(false);
  await act(async () => root.unmount());
  root = createRoot(container);

  saveSidebarCollapsed(true);
  viewport(1440);
  await render("/");
  expect(sidebar()?.getAttribute("data-collapsed")).toBe("true");
});

it("collapses and expands from the sidebar button and remembers the choice", async () => {
  viewport(1440);
  await render("/");
  await press(named("Collapse the sidebar"));
  expect(sidebar()?.getAttribute("data-collapsed")).toBe("true");
  expect(loadSidebarCollapsed()).toBe(true);
  await press(named("Expand the sidebar"));
  expect(sidebar()?.hasAttribute("data-collapsed")).toBe(false);
  expect(loadSidebarCollapsed()).toBe(false);
});

it("marks Kiswahili as a draft beside the language button, where the menu note used to be", async () => {
  viewport(1440);
  state.lang = "en";
  await render("/");
  expect(container.querySelector("header")?.textContent).not.toContain("Draft");
  await act(async () => root.unmount());
  root = createRoot(container);

  state.lang = "sw";
  await render("/");
  const bar = container.querySelector("header")!;
  expect(bar.textContent).toContain("Draft");
  expect(bar.textContent).toContain(t("en", "swahiliDraft"));
});

/** Press a key where focus is now. Resolves to whether nothing cancelled it. */
async function pressKey(key: string, init: KeyboardEventInit = {}, on: EventTarget = document.activeElement ?? document.body): Promise<boolean> {
  let allowed = true;
  await act(async () => { allowed = on.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init })); });
  return allowed;
}

/** jsdom has no layout, so give the page area a height and record what it is asked to scroll. */
function watchScroll(main: HTMLElement) {
  Object.defineProperty(main, "clientHeight", { configurable: true, value: 800 });
  Object.defineProperty(main, "scrollHeight", { configurable: true, value: 3000 });
  const by = vi.fn();
  const to = vi.fn();
  main.scrollBy = by as unknown as typeof main.scrollBy;
  main.scrollTo = to as unknown as typeof main.scrollTo;
  return { by, to };
}

it("scrolls the page area for scroll keys when focus is in the sidebar, the top bar or nowhere, without moving focus, because the document does not scroll", async () => {
  viewport(1440);
  await render("/");
  const main = container.querySelector<HTMLElement>("main")!;
  const { by, to } = watchScroll(main);
  const sideLink = container.querySelector<HTMLElement>("aside a")!;

  sideLink.focus();
  expect(await pressKey("PageDown")).toBe(false);
  expect(by).toHaveBeenLastCalledWith({ top: 700, behavior: "smooth" });
  expect(await pressKey("PageUp")).toBe(false);
  expect(by).toHaveBeenLastCalledWith({ top: -700, behavior: "smooth" });
  await pressKey("ArrowDown");
  expect(by).toHaveBeenLastCalledWith({ top: 40, behavior: "smooth" });
  await pressKey("End");
  expect(to).toHaveBeenLastCalledWith({ top: 3000, behavior: "smooth" });
  await pressKey("Home");
  expect(to).toHaveBeenLastCalledWith({ top: 0, behavior: "smooth" });
  expect(document.activeElement).toBe(sideLink);

  container.querySelector<HTMLElement>("header button")!.focus();
  expect(await pressKey("PageDown")).toBe(false);

  (document.activeElement as HTMLElement).blur();
  expect(document.activeElement).toBe(document.body);
  expect(await pressKey(" ", {}, document.body)).toBe(false);
  expect(by).toHaveBeenLastCalledWith({ top: 700, behavior: "smooth" });
  await pressKey(" ", { shiftKey: true }, document.body);
  expect(by).toHaveBeenLastCalledWith({ top: -700, behavior: "smooth" });
});

it("leaves keys to the browser when focus is in the page or a dialog, when a modifier is held, for keys that do not scroll, and for Space on a focused link", async () => {
  viewport(1440);
  await render("/");
  const main = container.querySelector<HTMLElement>("main")!;
  const { by, to } = watchScroll(main);
  const sideLink = container.querySelector<HTMLElement>("aside a")!;

  container.querySelector<HTMLElement>("main button")!.focus();
  expect(await pressKey("PageDown")).toBe(true);

  const dialog = document.createElement("div");
  dialog.setAttribute("role", "dialog");
  dialog.tabIndex = -1;
  document.body.append(dialog);
  dialog.focus();
  expect(await pressKey("PageDown")).toBe(true);
  dialog.remove();

  sideLink.focus();
  expect(await pressKey("PageDown", { ctrlKey: true })).toBe(true);
  expect(await pressKey("Enter")).toBe(true);
  expect(await pressKey(" ")).toBe(true);
  expect(by).not.toHaveBeenCalled();
  expect(to).not.toHaveBeenCalled();
});

it("does not touch scroll keys on a phone, where the document scrolls", async () => {
  await render("/");
  container.querySelector<HTMLElement>("nav a")!.focus();
  expect(await pressKey("PageDown")).toBe(true);
});

it("puts language, appearance and location in the top bar", async () => {
  viewport(1440);
  await render("/");
  const language = [...container.querySelectorAll("header button")].find((button) => button.textContent?.includes("EN"))!;
  expect(language.getAttribute("aria-label") ?? language.textContent).toContain("Switch to Kiswahili");
  await press(language);
  expect(state.setLang).toHaveBeenCalledWith("sw");

  await press(named("Appearance: Match device"));
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(named("Appearance: Light")).not.toBeNull();

  await press(named("Use my location"));
  expect(state.locate).toHaveBeenCalledOnce();
});
