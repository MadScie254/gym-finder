// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createVenueSearch } from "../../data/loadVenues";
import type { Venue } from "../../data/types";
import { t } from "../../lib/i18n";
import { StoreProvider } from "../../app/stores";
import { ComparePage } from "./ComparePage";

const state = vi.hoisted(() => ({ index: null as unknown }));
vi.mock("../../app/venue-context", () => ({
  useVenueContext: () => ({ index: state.index, origin: null, lang: "en" }),
  useT: () => (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t("en", key, vars),
}));

const first: Venue = {
  id: "one", slug: "one", aliases: [], name: "Gym One", kind: "gym", lat: -1.28, lng: 36.82,
  area: null, town: null, county: "Nairobi", address: null, phones: [], whatsapp: null,
  website: null, instagram: null, facebook: null, hours: null, fee: null, amenities: {},
  trust: { tier: "listed", score: 0, reasons: [], sources: ["osm"], lastSeen: null, stale: false, verifiedAt: null },
  provenance: {}, osmUrl: null,
};
const second = { ...first, id: "two", slug: "two", name: "Gym Two" };

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="search-params">{location.search}</output>;
}

function indexOf(venues: Venue[]) {
  return { venues, byId: new Map(venues.map((venue) => [venue.id, venue])), search: createVenueSearch(venues) };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  state.index = indexOf([first, second]);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} }));
  window.localStorage.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function columns() {
  return [...container.querySelectorAll("thead th")].map((cell) => cell.textContent);
}

it("ignores invalid and duplicate URL ids and lets people add a gym by name", async () => {
  await act(async () => root.render(
    <StoreProvider><MemoryRouter initialEntries={["/compare?ids=missing,one,one"]}>
      <Routes><Route path="/compare" element={<><ComparePage /><LocationProbe /></>} /></Routes>
    </MemoryRouter></StoreProvider>,
  ));
  expect(columns()).toEqual(["Gym One"]);
  expect(container.textContent).not.toContain("paste");
  const input = container.querySelector<HTMLInputElement>("input[role='combobox']")!;
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, "Gym Two");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const option = [...container.querySelectorAll("[role='option']")].find((item) => item.textContent?.includes("Gym Two"))!;
  await act(async () => (option as HTMLElement).click());
  expect(columns()).toEqual(["Gym One", "Gym Two"]);
  expect(container.querySelector('[data-testid="search-params"]')?.textContent).toContain("ids=one%2Ctwo");
});

it("does not offer a fourth gym", async () => {
  const third = { ...first, id: "three", slug: "three", name: "Gym Three" };
  const fourth = { ...first, id: "four", slug: "four", name: "Gym Four" };
  state.index = indexOf([first, second, third, fourth]);
  await act(async () => root.render(
    <StoreProvider><MemoryRouter initialEntries={["/compare?ids=one,two,three,four"]}>
      <Routes><Route path="/compare" element={<ComparePage />} /></Routes>
    </MemoryRouter></StoreProvider>,
  ));
  expect(columns()).toEqual(["Gym One", "Gym Two", "Gym Three"]);
  expect(container.querySelector("input[role='combobox']")).toBeNull();
});

it("shows missing facts as Not listed, never a score", async () => {
  await act(async () => root.render(
    <StoreProvider><MemoryRouter initialEntries={["/compare?ids=one,two"]}>
      <Routes><Route path="/compare" element={<ComparePage />} /></Routes>
    </MemoryRouter></StoreProvider>,
  ));
  expect(container.textContent).toContain("Not listed");
  expect(container.textContent).not.toMatch(/score|best match/i);
});
