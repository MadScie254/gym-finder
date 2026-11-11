// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Venue } from "../../data/types";
import { ResultCard } from "./ResultCard";

const venue: Venue = {
  id: "one", slug: "one", aliases: [], name: "Gym One", kind: "gym", lat: -1.28, lng: 36.82,
  area: "Central", town: "Nairobi", county: "Nairobi", address: null, phones: [], whatsapp: null,
  website: null, instagram: null, facebook: null, hours: null, fee: null, amenities: {},
  trust: { tier: "listed", score: 0, reasons: [], sources: ["osm"], lastSeen: null, stale: false, verifiedAt: null },
  provenance: {}, osmUrl: null,
};

function Harness() {
  const [compared, setCompared] = useState(false);
  return <MemoryRouter><ResultCard venue={venue} origin={{ lat: -1.29, lng: 36.81 }} selected={false}
    saved={false} onSave={() => {}} compared={compared} onCompare={() => setCompared(!compared)} /></MemoryRouter>;
}

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

it("lets a visitor select a result for comparison without an internal ID", async () => {
  await act(async () => root.render(<Harness />));
  const button = [...container.querySelectorAll("button")].find((item) => item.textContent === "Compare")!;
  expect(button.getAttribute("aria-pressed")).toBe("false");
  await act(async () => button.click());
  expect(button.getAttribute("aria-pressed")).toBe("true");
});

it("labels distance as straight-line rather than claiming a walking time", async () => {
  await act(async () => root.render(<Harness />));
  expect(container.textContent).toContain("straight-line");
  expect(container.textContent).not.toContain("min walk");
});
