import { describe, expect, it } from "vitest";

import { applyFilters, rankGyms } from "./scoreGyms";
import type { ClientProfile, Gym, GymFilters } from "./types";

const profile: ClientProfile = { goals: [], budget: "any", amenities: [] };
const filters: GymFilters = {
  openNow: false,
  minRating: 0,
  price: "any",
  radiusMeters: 5_000,
};

function gym(overrides: Partial<Gym> = {}): Gym {
  return {
    id: "gym",
    name: "Gym",
    address: "Nairobi",
    location: { lat: -1.286, lng: 36.817 },
    rating: null,
    userRatingCount: 0,
    priceLevel: null,
    openNow: null,
    types: [],
    photoName: null,
    googleMapsUri: null,
    phone: null,
    website: null,
    weekdayHours: [],
    reviews: [],
    editorialSummary: null,
    distanceKm: null,
    score: 0,
    labels: [],
    ...overrides,
  };
}

describe("gym filtering and ranking", () => {
  it("does not treat unavailable price data as a budget match", () => {
    const results = applyFilters(
      [gym({ id: "unknown" }), gym({ id: "free", priceLevel: "PRICE_LEVEL_FREE" })],
      { ...filters, price: "free" },
    );

    expect(results.map((item) => item.id)).toEqual(["free"]);
  });

  it("only includes venues explicitly mapped as open 24/7", () => {
    const results = applyFilters(
      [gym({ id: "unknown", openNow: null }), gym({ id: "always-open", openNow: true })],
      { ...filters, openNow: true },
    );

    expect(results.map((item) => item.id)).toEqual(["always-open"]);
  });

  it("marks the closest venue and the best match", () => {
    const ranked = rankGyms(
      [
        gym({ id: "near", location: { lat: -1.289, lng: 36.817 } }),
        gym({ id: "open", location: { lat: -1.292, lng: 36.817 }, openNow: true }),
      ],
      { lat: -1.286, lng: 36.817 },
      profile,
      filters,
    );

    expect(ranked[0].id).toBe("open");
    expect(ranked.find((item) => item.id === "near")?.labels).toContain("closest");
    expect(ranked.find((item) => item.id === "open")?.labels).toContain("best_match");
  });

  it("does not rank a distant 24/7 listing ahead of a local gym", () => {
    const ranked = rankGyms(
      [
        gym({ id: "local", location: { lat: -1.25, lng: 36.817 } }),
        gym({ id: "far", location: { lat: -0.32, lng: 36.817 }, openNow: true }),
      ],
      { lat: -1.286, lng: 36.817 },
      profile,
      { ...filters, radiusMeters: 0 },
    );
    expect(ranked[0].id).toBe("local");
    expect(ranked.map((item) => item.distanceKm)).toEqual(
      [...ranked.map((item) => item.distanceKm)].sort((a, b) => (a ?? Infinity) - (b ?? Infinity)),
    );
  });
});
