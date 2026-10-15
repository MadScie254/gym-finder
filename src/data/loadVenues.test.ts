import { describe, expect, it } from "vitest";
import { buildSearch, fuzzyDistance, searchVenues, type VenueIndex } from "./loadVenues";
import type { DataManifest, TrustTier, Venue } from "./types";

function venue(id: string, name: string, area: string | null = null, tier: TrustTier = "listed"): Venue {
  return {
    id, slug: id, aliases: [], name, kind: "gym", lat: -1.28, lng: 36.82,
    area, town: "Nairobi", county: "Nairobi", address: null,
    phones: [], whatsapp: null, website: null, instagram: null, facebook: null,
    hours: null, fee: null, amenities: {},
    trust: { tier, score: 50, reasons: [], sources: ["overture"], lastSeen: null, stale: false, verifiedAt: null },
    provenance: {}, osmUrl: null,
  };
}

const FIXTURES = [
  venue("a", "Salute Gym", "Kilimani"),
  venue("b", "Veteran Fitness Center", "Ruaraka"),
  venue("c", "Lever Gym", "Westlands"),
  venue("d", "Level Gym", "Westlands"),
  venue("e", "DOJO", "Karen"),
  venue("f", "Judo Club", "Karen"),
  venue("g", "Ab Studio", "Lavington"),
  venue("h", "Vorna Value Shopping", "Kasarani", "unconfirmed"),
];

const index: VenueIndex = {
  manifest: {} as DataManifest,
  venues: FIXTURES,
  byId: new Map(FIXTURES.map((v) => [v.id, v])),
  bySlug: new Map(FIXTURES.map((v) => [v.slug, v])),
  search: buildSearch(FIXTURES),
  builtMs: 0,
};
const names = (query: string, includeUnconfirmed = false) => searchVenues(index, query, includeUnconfirmed).map((v) => v.name);

describe("fuzzyDistance", () => {
  it("allows no edits for 1-2 letters, one for 3-5, two for 6+", () => {
    expect([fuzzyDistance("a"), fuzzyDistance("ab")]).toEqual([0, 0]);
    expect([fuzzyDistance("gym"), fuzzyDistance("level")]).toEqual([1, 1]);
    expect([fuzzyDistance("salute"), fuzzyDistance("veteran")]).toEqual([2, 2]);
  });
});

describe("venue search typo tolerance", () => {
  it("finds a 6+ letter word with an adjacent swap, a deletion or a substitution", () => {
    expect(names("Slaute Gym")[0]).toBe("Salute Gym");
    expect(names("Vteeran Fitness Center")[0]).toBe("Veteran Fitness Center");
    expect(names("Vetran")[0]).toBe("Veteran Fitness Center");
    expect(names("Salate")[0]).toBe("Salute Gym");
  });

  it("ranks the exact match above a near neighbour", () => {
    expect(names("Lever Gym").slice(0, 2)).toEqual(["Lever Gym", "Level Gym"]);
    expect(names("Level Gym").slice(0, 2)).toEqual(["Level Gym", "Lever Gym"]);
  });

  it("ranks a prefix match above fuzzy neighbours", () => {
    expect(names("Salu")[0]).toBe("Salute Gym");
  });

  it("does not flood: short words get no or one edit", () => {
    expect(names("dojo")).toEqual(["DOJO"]); // "judo" is two edits away
    expect(names("ac")).toEqual([]); // two letters: no fuzzy, so "Ab Studio" is not a match
  });

  it("keeps unconfirmed venues out unless the exact name is searched", () => {
    expect(names("Vorna Value")).not.toContain("Vorna Value Shopping");
    expect(names("Vorna Value Shopping")).toContain("Vorna Value Shopping");
  });
});
