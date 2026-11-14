import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import type { Venue } from "../data/types";
import { CommutePage } from "./commute/CommutePage";
import { Detail } from "./detail/Detail";

vi.mock("../app/venue-context", () => ({ useVenueContext: () => ({ index: null, origin: null }) }));

const venue: Venue = {
  id: "one", slug: "one", aliases: [], name: "Gym One", kind: "gym", lat: -1.28, lng: 36.82,
  area: "Central", town: "Nairobi", county: "Nairobi", address: null, phones: [], whatsapp: null,
  website: null, instagram: null, facebook: null, hours: null, fee: null, amenities: {},
  trust: { tier: "listed", score: 0, reasons: [], sources: ["osm"], lastSeen: null, stale: false, verifiedAt: null },
  provenance: {}, osmUrl: null,
};

it("does not turn straight-line distance into an estimated walk on gym pages", () => {
  const html = renderToStaticMarkup(<MemoryRouter><Detail venue={venue} lang="en" origin={{ lat: -1.29, lng: 36.81 }} /></MemoryRouter>);
  expect(html).toContain("straight line");
  expect(html).not.toContain("min walk");
});

it("labels the commute feature as proximity to a line rather than road routing", () => {
  const html = renderToStaticMarkup(<MemoryRouter><CommutePage /></MemoryRouter>);
  expect(html).toContain("Near your commute line");
  expect(html).not.toContain("Gym on my way");
});

it("offers an actionable correction link when no support inbox is configured", () => {
  const html = renderToStaticMarkup(<MemoryRouter><Detail venue={venue} lang="en" origin={null} /></MemoryRouter>);
  expect(html).toContain(">Suggest a correction on OpenStreetMap</a>");
  expect(html).not.toContain("Is something wrong? ·");
});
