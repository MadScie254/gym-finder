import { describe, expect, it } from "vitest";
import { foldPlace, isKnownPlace, venuesInPlace } from "./filterVenues";
import type { Venue } from "../data/types";

function venue(id: string, place: { county?: string; town?: string; area?: string }, lat = -0.09, lng = 34.77): Venue {
  return {
    id, slug: id, name: id, lat, lng,
    county: place.county ?? null, town: place.town ?? null, area: place.area ?? null,
  } as unknown as Venue;
}

const venues = [
  venue("kisumu-gym", { county: "Kisumu", town: "Kisumu" }),
  venue("kiambu-gym", { county: "Kiambu", town: "Kiambu" }, -1.17, 36.83),
  venue("westlands-gym", { county: "Nairobi", area: "Westlands" }, -1.26, 36.8),
  venue("muranga-gym", { county: "Murang'a" }, -0.72, 37.15),
];

describe("place filtering", () => {
  it("folds case, accents, apostrophes and hyphens", () => {
    expect(foldPlace("  Murang’a ")).toBe(foldPlace("muranga"));
    expect(foldPlace("Taita-Taveta")).toBe("taita taveta");
  });

  it("matches the exact place, never a fuzzy neighbour (Kisumu is not Kiambu)", () => {
    expect(venuesInPlace(venues, "Kisumu").map((v) => v.id)).toEqual(["kisumu-gym"]);
    expect(venuesInPlace(venues, "westlands").map((v) => v.id)).toEqual(["westlands-gym"]);
    expect(venuesInPlace(venues, "Muranga").map((v) => v.id)).toEqual(["muranga-gym"]);
  });

  it("falls back to a radius around the place when no venue carries its name", () => {
    const nearKisumu = { lat: -0.1, lng: 34.75 };
    expect(venuesInPlace(venues, "Kondele", nearKisumu).map((v) => v.id)).toEqual(["kisumu-gym"]);
    expect(venuesInPlace(venues, "Kondele")).toEqual([]);
  });

  it("knows which names are places", () => {
    expect(isKnownPlace(venues, "WESTLANDS")).toBe(true);
    expect(isKnownPlace(venues, "Level 24")).toBe(false);
  });
});
