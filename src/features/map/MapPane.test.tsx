// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type { Venue } from "../../data/types";
import { MapPane } from "./MapPane";

const state = vi.hoisted(() => ({ maps: [] as unknown[], navigate: vi.fn() }));

type FeatureCollection = { features: Array<{ properties: { id: string } }> };
type TestMap = {
  sources: Record<string, { data: FeatureCollection; setData: (data: FeatureCollection) => void }>;
  flyTo: ReturnType<typeof vi.fn>;
  emitLoad: () => void;
};

vi.mock("react-router", () => ({ useNavigate: () => state.navigate }));
vi.mock("maplibre-gl", () => {
  class FakeMap {
    sources: TestMap["sources"] = {};
    handlers: Record<string, () => void> = {};
    flyTo = vi.fn();
    constructor() { state.maps.push(this); }
    addControl() {}
    on(name: string, layerOrHandler: string | (() => void), handler?: () => void) {
      if (name === "load" && typeof layerOrHandler === "function") this.handlers.load = layerOrHandler;
      if (handler) this.handlers[`${name}:${layerOrHandler}`] = handler;
    }
    emitLoad() { this.handlers.load?.(); }
    addSource(name: string, options: { data: FeatureCollection }) {
      this.sources[name] = { data: options.data, setData(data) { this.data = data; } };
    }
    getSource(name: string) { return this.sources[name]; }
    addLayer() {}
    getLayer(name: string) { return name === "pins" && this.sources.venues ? {} : undefined; }
    setPaintProperty() {}
    resize() {}
    remove() {}
  }
  return { Map: FakeMap, NavigationControl: class {}, setWorkerUrl: () => {} };
});

const venue: Venue = {
  id: "gym-1", slug: "gym-1", aliases: [], name: "Gym One", kind: "gym",
  lat: -1.28, lng: 36.82, area: "Central", town: "Nairobi", county: "Nairobi",
  address: null, phones: [], whatsapp: null, website: null, instagram: null,
  facebook: null, hours: null, fee: null, amenities: {},
  trust: { tier: "listed", score: 0, reasons: [], sources: ["osm"], lastSeen: null, stale: false, verifiedAt: null },
  provenance: {}, osmUrl: null,
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  state.maps.length = 0;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it("shows loaded venues when the map style finishes after React effects", async () => {
  await act(async () => root.render(<MapPane venues={[venue]} selectedId={null} />));
  const map = state.maps[0] as TestMap;
  await act(async () => map.emitLoad());
  expect(map.sources.venues.data.features.map((feature) => feature.properties.id)).toEqual(["gym-1"]);
});

it("focuses the selected gym after it becomes selected", async () => {
  await act(async () => root.render(<MapPane venues={[venue]} selectedId={null} />));
  const map = state.maps[0] as TestMap;
  await act(async () => map.emitLoad());
  await act(async () => root.render(<MapPane venues={[venue]} selectedId="gym-1" />));
  expect(map.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [36.82, -1.28] }));
});

it("focuses device location when provided without a selected gym", async () => {
  await act(async () => root.render(<MapPane venues={[venue]} selectedId={null} origin={null} />));
  const map = state.maps[0] as TestMap;
  await act(async () => map.emitLoad());
  await act(async () => root.render(<MapPane venues={[venue]} selectedId={null} origin={{ lat: -4.05, lng: 39.68 }} />));
  expect(map.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [39.68, -4.05] }));
});
