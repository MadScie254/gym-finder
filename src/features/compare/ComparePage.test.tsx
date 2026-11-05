// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Venue } from "../../data/types";
import { ComparePage } from "./ComparePage";

const state = vi.hoisted(() => ({ index: null as unknown }));
vi.mock("../../app/venue-context", () => ({ useVenueContext: () => ({ index: state.index }) }));

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

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  state.index = { venues: [first, second], byId: new Map([[first.id, first], [second.id, second]]) };
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it("ignores invalid and duplicate URL IDs and lets people add a gym by name", async () => {
  await act(async () => root.render(
    <MemoryRouter initialEntries={["/compare?ids=missing,one,one"]}>
      <Routes><Route path="/compare" element={<><ComparePage /><LocationProbe /></>} /></Routes>
    </MemoryRouter>,
  ));
  expect(container.querySelectorAll(".compare-grid article")).toHaveLength(1);
  expect(container.textContent).not.toContain("paste ids");
  const select = container.querySelector("select")!;
  await act(async () => {
    select.value = "two";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const addButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "Add gym")!;
  await act(async () => addButton.click());
  expect(container.querySelectorAll(".compare-grid article")).toHaveLength(2);
  expect(container.querySelector('[data-testid="search-params"]')?.textContent).toContain("ids=one%2Ctwo");
});

it("does not allow a fourth gym in the comparison", async () => {
  const third = { ...first, id: "three", slug: "three", name: "Gym Three" };
  const fourth = { ...first, id: "four", slug: "four", name: "Gym Four" };
  state.index = { venues: [first, second, third, fourth], byId: new Map([first, second, third, fourth].map((venue) => [venue.id, venue])) };
  await act(async () => root.render(
    <MemoryRouter initialEntries={["/compare?ids=one,two,three"]}>
      <Routes><Route path="/compare" element={<ComparePage />} /></Routes>
    </MemoryRouter>,
  ));
  expect(container.querySelectorAll(".compare-grid article")).toHaveLength(3);
  expect(container.querySelector("select")).toBeNull();
});
