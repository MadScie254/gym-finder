// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act } from "react";
import { useLocation } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StoreProvider } from "../../app/stores";
import { createVenueSearch, type VenueIndex } from "../../data/loadVenues";
import type { DataManifest, Venue } from "../../data/types";
import { t } from "../../lib/i18n";
import { loadSaved } from "../../lib/saved";
import { loadRecentSearches } from "../../lib/storage";
import { Dialog } from "../../ui/Dialog";
import { click, mount, press, type, type Mounted } from "../../ui/test-utils";
import { PaletteProvider, usePalette } from "./palette-context";

const manifest = JSON.parse(readFileSync(join(process.cwd(), "public/data/manifest.json"), "utf8")) as DataManifest;
const venues = JSON.parse(readFileSync(join(process.cwd(), "public", manifest.gymsPath), "utf8")).gyms as Venue[];
const index: VenueIndex = {
  manifest, venues, search: createVenueSearch(venues), builtMs: 0,
  byId: new Map(venues.map((v) => [v.id, v])), bySlug: new Map(venues.map((v) => [v.slug, v])),
};
const salute = venues.find((venue) => venue.name === "Salute Gym")!;

const mocks = vi.hoisted(() => ({ setLang: vi.fn(), locate: vi.fn(), openReport: vi.fn(), install: vi.fn() }));

vi.mock("../../app/venue-context", () => ({
  useVenueContext: () => ({ lang: "en", index, origin: null, offline: false, locate: mocks.locate, setLang: mocks.setLang }),
  useT: () => (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t("en", key, vars),
}));
vi.mock("../report/report-store", () => ({ useReport: () => ({ open: mocks.openReport }) }));
vi.mock("../../app/pwa", () => ({ usePwa: () => ({ canInstall: false, install: mocks.install, updateReady: false, applyUpdate: vi.fn() }) }));
vi.mock("../../lib/landmarks", async (original) => ({ ...(await original<typeof import("../../lib/landmarks")>()), loadLandmarks: () => Promise.resolve([]) }));

let ui: Mounted | undefined;
let wide = true;

beforeEach(() => {
  wide = true;
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: wide, media: query, addEventListener() {}, removeEventListener() {} }));
  mocks.setLang.mockClear();
  mocks.locate.mockClear();
  mocks.openReport.mockClear();
});

afterEach(async () => {
  await ui?.unmount();
  ui = undefined;
  vi.unstubAllGlobals();
});

function Probe() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
}

function Page({ withDialog = false }: { withDialog?: boolean }) {
  const palette = usePalette();
  return (
    <>
      <button type="button" onClick={palette.show}>Opener</button>
      <input aria-label="Plain field" />
      <Probe />
      {withDialog && <Dialog open onOpenChange={() => undefined} title="Another dialog">Body</Dialog>}
    </>
  );
}

async function render(route = "/", props: { withDialog?: boolean } = {}) {
  ui = await mount(<StoreProvider><PaletteProvider><Page {...props} /></PaletteProvider></StoreProvider>, { route });
  return ui;
}

async function waitFor(check: () => unknown, label: string) {
  for (let i = 0; i < 150; i += 1) {
    if (check()) return;
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
  }
  throw new Error(`Timed out waiting for ${label}`);
}

/** Press a key chord. Resolves to whether the page left the browser's default action alone. */
async function chord(init: KeyboardEventInit, target: EventTarget = document.body): Promise<boolean> {
  let allowed = true;
  await act(async () => {
    allowed = target.dispatchEvent(new KeyboardEvent("keydown", { key: "k", bubbles: true, cancelable: true, ...init }));
  });
  return allowed;
}

const palette = () => document.querySelector<HTMLElement>("[data-palette]");
const field = () => document.querySelector<HTMLInputElement>("[data-palette] input")!;
const rows = () => [...document.querySelectorAll<HTMLElement>("[data-palette] [role='option']")];
const where = () => document.querySelector("[data-testid='where']")?.textContent;
const activeRow = () => document.getElementById(field().getAttribute("aria-activedescendant") ?? "");
const groupLabels = () => [...document.querySelectorAll("[data-palette] [role='group']")]
  .map((group) => document.getElementById(group.getAttribute("aria-labelledby") ?? "")?.textContent);
const rowNamed = (text: string) => rows().find((row) => row.textContent?.includes(text))!;

async function open(route = "/") {
  await render(route);
  await chord({ ctrlKey: true });
  await waitFor(palette, "the palette to open");
}

it("opens on Ctrl K and Command K and closes on Escape, handing focus back to the opener", async () => {
  await render();
  const opener = ui!.container.querySelector("button")!;
  opener.focus();

  expect(await chord({ ctrlKey: true })).toBe(false);
  await waitFor(palette, "the palette to open");
  expect(palette()?.getAttribute("role")).toBe("dialog");
  await waitFor(() => document.activeElement === field(), "focus in the field");

  await press(field(), "Escape");
  await waitFor(() => !palette(), "the palette to close");
  await waitFor(() => document.activeElement === opener, "focus back on the opener");

  await chord({ metaKey: true });
  await waitFor(palette, "the palette to open again");
});

it("opens from the shortcut while a text field has focus, and a second press closes it", async () => {
  await render();
  const plain = ui!.container.querySelector("input")!;
  plain.focus();
  expect(await chord({ ctrlKey: true }, plain)).toBe(false);
  await waitFor(palette, "the palette to open");

  await chord({ ctrlKey: true }, field());
  await waitFor(() => !palette(), "the palette to close");
});

it("leaves the shortcut alone while another dialog is open", async () => {
  await render("/", { withDialog: true });
  await waitFor(() => document.querySelector("[role='dialog'][data-state='open']"), "the other dialog");
  expect(await chord({ ctrlKey: true })).toBe(true);
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
  expect(palette()).toBeNull();
});

it("is a full-height sheet below 900 px and a centred modal from 900 px", async () => {
  wide = false;
  await open();
  expect(palette()?.getAttribute("data-variant")).toBe("sheet");
  expect(document.querySelector("[data-palette] [aria-label='Close quick actions']")).not.toBeNull();
  await ui!.unmount();

  wide = true;
  await open();
  expect(palette()?.getAttribute("data-variant")).toBe("modal");
  expect(document.querySelector("[data-palette] [aria-label='Close quick actions']")).toBeNull();
});

it("follows the combobox pattern and lists the three command groups for an empty query", async () => {
  await open();
  expect(field().getAttribute("role")).toBe("combobox");
  expect(field().getAttribute("aria-expanded")).toBe("true");
  const list = document.getElementById(field().getAttribute("aria-controls")!)!;
  expect(list.getAttribute("role")).toBe("listbox");
  expect(groupLabels()).toEqual(["Actions", "Go to", "Settings"]);
  expect(activeRow()?.textContent).toContain("Use my location");
  expect(activeRow()?.getAttribute("aria-selected")).toBe("true");
});

it("still lists every group when the query is only spaces", async () => {
  await open();
  await type(field(), "   ");
  expect(groupLabels()).toEqual(["Actions", "Go to", "Settings"]);
});

it("moves the active row with the arrow keys and wraps at both ends", async () => {
  await open();
  const first = field().getAttribute("aria-activedescendant");
  await press(field(), "ArrowDown");
  expect(field().getAttribute("aria-activedescendant")).not.toBe(first);
  expect(activeRow()?.textContent).toContain("Add a missing gym");
  await press(field(), "ArrowUp");
  expect(field().getAttribute("aria-activedescendant")).toBe(first);
  await press(field(), "ArrowUp");
  expect(activeRow()).toBe(rows().at(-1));
  await press(field(), "ArrowDown");
  expect(field().getAttribute("aria-activedescendant")).toBe(first);
});

it("finds Salute Gym for a typo, opens it with Enter and remembers the search", async () => {
  await open();
  await type(field(), "slaute");
  expect(rows()[0].textContent).toContain("Salute Gym");
  await press(field(), "Enter");
  expect(where()).toBe(`/gym/${salute.slug}`);
  expect(loadRecentSearches()[0]).toEqual({ label: "Salute Gym", href: `/gym/${salute.slug}` });
  await waitFor(() => !palette(), "the palette to close");
});

it("opens the My week page for 'week'", async () => {
  await open();
  await type(field(), "week");
  expect(rows()[0].textContent).toContain("My week");
  await press(field(), "Enter");
  expect(where()).toBe("/plan");
});

it("puts a command first when it matches better than every gym, so Enter does what was typed", async () => {
  await open();
  await type(field(), "add a missing gym");
  expect(rows()[0].textContent).toContain("Add a missing gym");
  await press(field(), "Enter");
  expect(mocks.openReport).toHaveBeenCalledWith("add_gym", null);
});

it("keeps gyms first when they match as well as a command does", async () => {
  await open();
  await type(field(), "gym");
  expect(groupLabels()[0]).toBe("Gyms");
});

it("runs a row on click and closes", async () => {
  await open();
  await click(rowNamed("Order food"));
  expect(where()).toBe("/fuel");
  await waitFor(() => !palette(), "the palette to close");
});

it("marks Order food as a demo", async () => {
  await open();
  expect(rowNamed("Order food").textContent).toContain("Demo");
  expect(rowNamed("My reports").textContent).not.toContain("Demo");
});

it("says so when nothing matches, and still offers a full search", async () => {
  await open();
  await type(field(), "zzzzzz");
  const status = document.querySelector("[data-palette] [role='status']");
  expect(status?.textContent).toBe(t("en", "paletteEmpty"));
  expect(rows()).toHaveLength(1);
  expect(rows()[0].textContent).toBe("Search all gyms for “zzzzzz”");
  await press(field(), "Enter");
  expect(where()).toBe("/search?q=zzzzzz");
  expect(loadRecentSearches()[0]).toEqual({ label: "zzzzzz", href: "/search?q=zzzzzz" });
});

it("offers the full search last when something does match", async () => {
  await open();
  await type(field(), "week");
  expect(rows().at(-1)?.textContent).toBe("Search all gyms for “week”");
  expect(document.querySelector("[data-palette] [role='status']")?.textContent).not.toBe(t("en", "paletteEmpty"));
});

it("cycles the appearance and saves the choice", async () => {
  await open();
  await click(rowNamed("Appearance: Match device"));
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(localStorage.getItem("fmg-theme")).toContain("light");
});

it("switches the language from the quick actions", async () => {
  await open();
  await type(field(), "kiswa");
  await press(field(), "Enter");
  expect(mocks.setLang).toHaveBeenCalledWith("sw");
});

it("asks for the device location", async () => {
  await open();
  await press(field(), "Enter");
  expect(mocks.locate).toHaveBeenCalledOnce();
});

it("offers the gym commands only on a gym page", async () => {
  await open("/");
  await type(field(), "report");
  expect(rows().some((row) => row.textContent?.includes("Report a problem with this gym"))).toBe(false);
  await ui!.unmount();

  await open(`/gym/${salute.slug}`);
  await type(field(), "report a problem");
  expect(rows()[0].textContent).toContain("Report a problem with this gym");
  await press(field(), "Enter");
  expect(mocks.openReport).toHaveBeenCalledWith("wrong_details", salute);
});

it("saves the gym on screen from the palette", async () => {
  await open(`/gym/${salute.slug}`);
  await type(field(), "save this");
  expect(rows()[0].textContent).toContain("Save this gym");
  await press(field(), "Enter");
  await waitFor(() => loadSaved().some((entry) => entry.id === salute.id), "the gym to be saved");
});
