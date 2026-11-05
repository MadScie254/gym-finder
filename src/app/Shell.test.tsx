// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Shell } from "./Shell";

vi.mock("./venue-context", () => ({
  useVenueContext: () => ({
    lang: "en", offline: false, index: null, visible: [], selectedId: null, origin: null,
    setOrigin: vi.fn(), setLocationNote: vi.fn(),
  }),
}));
vi.mock("../features/map/MapPane", () => ({ MapPane: () => <div>Map canvas</div> }));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
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

it("opens with results and keeps the map switch outside the hidden map slot", async () => {
  await act(async () => root.render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes><Route element={<Shell />}><Route path="/" element={<p>Results</p>} /></Route></Routes>
    </MemoryRouter>,
  ));
  expect(container.querySelector(".workspace--list")).not.toBeNull();
  const mapButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "Map");
  expect(mapButton?.closest(".map-slot")).toBeNull();
  await act(async () => mapButton?.click());
  expect(container.querySelector(".workspace--map")).not.toBeNull();
  expect([...container.querySelectorAll("button")].some((button) => button.textContent === "List")).toBe(true);
});
