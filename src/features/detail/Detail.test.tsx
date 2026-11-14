import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";
import type { Venue } from "../../data/types";
import { Detail } from "./Detail";

const venue: Venue = {
  id: "gym-1", slug: "sample-gym", aliases: [], name: "Sample Gym", kind: "gym",
  lat: -1.28, lng: 36.82, area: "Westlands", town: "Nairobi", county: "Nairobi",
  address: null, phones: ["+254700000000"], whatsapp: null,
  website: "https://example.org/gym", instagram: null, facebook: null,
  hours: { raw: "", text: "Mon–Sat, 6 am–9 pm", source: "override" },
  fee: null, amenities: { weights: true },
  prices: {
    dayPass: { amount: 500, currency: "KES", period: "day", text: "KES 500 day pass", asOf: "2026-11-10", sourceUrl: "https://example.org/prices" },
  },
  verification: { method: "website", checkedAt: "2026-11-10", evidence: {} },
  trust: { tier: "verified", score: 95, reasons: ["Hours and price checked on the gym website"], sources: ["overture", "gym website"], lastSeen: "2026-11-10", stale: false, verifiedAt: "2026-11-10" },
  provenance: {}, osmUrl: null,
};

it("shows sourced details and keeps unknown fields honest", () => {
  const html = renderToStaticMarkup(<MemoryRouter><Detail venue={venue} lang="en" origin={null} /></MemoryRouter>);
  expect(html).toContain("Address not listed");
  expect(html).toContain("Mon–Sat, 6 am–9 pm");
  expect(html).toContain("KES 500 day pass");
  expect(html).toContain("https://example.org/prices");
  expect(html).toContain("Checked on the gym");
  expect(html).toContain("Weights");
  expect(html).not.toContain("Open now");
});
