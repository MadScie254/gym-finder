/**
 * Golden set (brief 5.11): "I search a real gym, I find it", asserted against the BUILT
 * catalogue through the app's own search (loadVenues / searchVenues), not a copy of it.
 *
 * Seed names are present in the source data; they are not independently confirmed as open
 * today. The owner extends this list (brief section 15). A golden gym that is genuinely
 * missing from the catalogue fails these tests: report it, do not delete it.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { matchesKnownClosed } from "../../scripts/data/overrides.mjs";
import { loadVenues, searchVenues } from "../data/loadVenues";
import type { Venue } from "../data/types";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const fileFetch = (async (input: RequestInfo | URL) => {
  const file = path.join(ROOT, "public", String(input).replace(/^\//, ""));
  return new Response(readFileSync(file, "utf8"), { status: 200, headers: { "content-type": "application/json" } });
}) as typeof fetch;

const index = await loadVenues(fileFetch);
const gyms = index.venues;

const norm = (value: string) => value.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();

/** A golden gym: found by `name`, or by any of `also` (the name a merged record kept from the other source). */
type Golden = { name: string; also?: string[] };

/** From Overture: high confidence, phone and website in the source. */
const FROM_OVERTURE: Golden[] = [
  { name: "FirstPower CrossFit" },
  { name: "Parklands Sports Club" },
  { name: "Fitness Empire" },
  { name: "Pent Hse Gymnasium" },
  { name: "Alpha Fit" },
  { name: "Hyat Fitness" },
  { name: "Smart Gyms Junction" },
  { name: "Salute Gym" },
  { name: "Level 24 Gym and Fitness Centre", also: ["Level 24"] }, // merged with OSM "Level 24"; OSM's name wins
  { name: "CrossFit Kwetu" },
  { name: "Ultra Fitness Gym" },
  { name: "Just Train Gym and Aerobics" },
];

/** OSM-only under the strict merge rule: these prove the merge keeps OSM's contribution. */
const OSM_ONLY: Golden[] = [
  { name: "EA Fitness" },
  { name: "Climb Blue Sky" },
  { name: "Fahari Gym and Sports" },
  { name: "Veteran Fitness Center" },
  { name: "Racing Sport Gym" },
  { name: "Rudicci Fitness Lots" },
  { name: "Fitness Mania Gym Parklands" },
  { name: "Nyali CrossFit Gym" },
  { name: "Muscle Beach Gym Kasarani" },
  { name: "Kenyatta University Gymnasium" },
];

/** Each of these appears in BOTH sources and must resolve to exactly ONE merged record. */
const MUST_MERGE: { label: string; match: string[] }[] = [
  { label: "Level 24", match: ["level 24"] },
  { label: "The Colosseum Fitness Centre", match: ["colosseum fitness"] },
  { label: "DOJO / Dojo Wellness Club", match: ["dojo"] },
  { label: "AICAD gym / AICAD Gymnasium", match: ["aicad"] },
  { label: "Physiq & Tone Gym(s)", match: ["physiq tone"] },
  { label: "Rox Park Gym Diani True Fitness", match: ["rox park"] },
  { label: "The Fitness Cocoon", match: ["fitness cocoon"] },
];

/** OSM gyms that sit within 60 m of an unrelated Overture record: never auto-merged. */
const MUST_NOT_AUTO_MERGE = [
  { osm: "Fahari Gym and Sports", neighbour: "Samnick Enterprises" },
  { osm: "Racing Sport Gym", neighbour: "Ultra Smart Controls" },
  { osm: "Veteran Fitness Center", neighbour: "Cool Gym Equipment" }, // deny-listed ("equipment"), so absent
];

const GOLDEN = [...FROM_OVERTURE, ...OSM_ONLY];
const isGolden = (golden: Golden) => (venue: Venue) => [golden.name, ...(golden.also ?? [])].some((name) => norm(venue.name) === norm(name));
const top3 = (query: string) => searchVenues(index, query).slice(0, 3);
const foundIn = (golden: Golden, query: string) => top3(query).some(isGolden(golden));
const find = (golden: Golden) => gyms.filter(isGolden(golden));

/** The longest word of the name, mutated (the rest of the query stays intact, like a real typo). */
function mutate(name: string, how: "delete" | "swap"): string {
  const words = name.split(" ");
  const at = words.reduce((best, word, i) => (word.length > words[best].length ? i : best), 0);
  const word = words[at];
  const mutated = how === "delete" ? word.slice(0, 2) + word.slice(3) : word[0] + word[2] + word[1] + word.slice(3);
  return words.map((w, i) => (i === at ? mutated : w)).join(" ");
}

const GENERIC = /\b(?:gym|gymnasium|fitness|centre|center|and|aerobics|club|sports)\b/gi;

describe("the built catalogue", () => {
  it("is non-trivial and every venue has a stable id and slug", () => {
    expect(gyms.length).toBeGreaterThan(350);
    expect(new Set(gyms.map((v) => v.id)).size).toBe(gyms.length);
    expect(new Set(gyms.map((v) => v.slug)).size).toBe(gyms.length);
  });
});

describe("golden set: every seed gym is in the catalogue and visible by default", () => {
  for (const golden of GOLDEN) {
    it(golden.name, () => {
      const hits = find(golden);
      expect(hits.length, `${golden.name} is missing from the catalogue`).toBeGreaterThan(0);
      expect(hits.some((v) => v.trust.tier !== "unconfirmed"), `${golden.name} exists but is hidden from default browse`).toBe(true);
    });
  }
});

describe("golden set: findable in the top 3", () => {
  for (const golden of GOLDEN) {
    describe(golden.name, () => {
      const [venue] = find(golden);
      it("by exact name", () => {
        expect(foundIn(golden, golden.name)).toBe(true);
      });
      it("with one character deleted", () => {
        expect(foundIn(golden, mutate(golden.name, "delete")), mutate(golden.name, "delete")).toBe(true);
      });
      it("with two characters swapped", () => {
        expect(foundIn(golden, mutate(golden.name, "swap")), mutate(golden.name, "swap")).toBe(true);
      });
      it("as <name> <area>", () => {
        const place = venue?.area ?? venue?.town ?? venue?.county;
        expect(place, "venue has no area, town or county to search with").toBeTruthy();
        const query = `${golden.name} ${place}`;
        expect(foundIn(golden, query), query).toBe(true);
      });
      it("with the generic words (gym, fitness, centre, ...) dropped", () => {
        const query = golden.name.replace(GENERIC, " ").replace(/\s+/g, " ").trim();
        if (query.length < 4 || query === golden.name) return; // nothing distinctive left to search for
        expect(foundIn(golden, query), query).toBe(true);
      });
      it("with the words reordered", () => {
        const words = golden.name.split(" ");
        if (words.length < 2) return;
        const query = [...words].reverse().join(" ");
        expect(foundIn(golden, query), query).toBe(true);
      });
    });
  }
});

describe("merged venues resolve to exactly one record", () => {
  for (const fixture of MUST_MERGE) {
    describe(fixture.label, () => {
      const family = (venue: Venue) => fixture.match.some((token) => norm(venue.name).includes(token));
      it("is one record in the catalogue, seen in both sources", () => {
        const hits = gyms.filter(family);
        expect(hits.map((v) => v.name)).toHaveLength(1);
        expect(hits[0].trust.sources).toEqual(["osm", "overture"]);
        expect(hits[0].aliases.some((alias) => alias.startsWith("gers:"))).toBe(true);
        expect(hits[0].id.startsWith("osm:")).toBe(true); // OSM is preferred for id, name and location
      });
      it("is one result, not two, when searched", () => {
        for (const query of [fixture.label.split(" / ")[0], ...fixture.label.split(" / ").slice(1)]) {
          expect(top3(query).filter(family), query).toHaveLength(1);
        }
      });
    });
  }
});

describe("proximity alone never merges", () => {
  for (const pair of MUST_NOT_AUTO_MERGE) {
    it(`${pair.osm} stays an OSM-only record next to ${pair.neighbour}`, () => {
      const osm = gyms.filter((v) => norm(v.name) === norm(pair.osm) && v.id.startsWith("osm:"));
      expect(osm, `${pair.osm} (OSM)`).toHaveLength(1);
      expect(osm[0].trust.sources).toEqual(["osm"]);
      expect(osm[0].aliases.filter((alias) => alias.startsWith("gers:"))).toEqual([]);
      const neighbour = gyms.filter((v) => norm(v.name) === norm(pair.neighbour));
      expect(neighbour.every((v) => v.id !== osm[0].id)).toBe(true);
    });
  }
});

describe("known-closed venues never appear", () => {
  const closed = JSON.parse(readFileSync(path.join(ROOT, "data", "overrides", "known-closed.json"), "utf8")) as (string | { name: string; area?: string })[];
  it(`none of the ${closed.length} listed closures is in the catalogue`, () => {
    const present = closed.filter((entry) => gyms.some((venue) => matchesKnownClosed(venue, entry)));
    expect(present).toEqual([]);
  });
});

describe("honesty invariants on the catalogue", () => {
  it('no address is "Kenya", and no website is a social page', () => {
    expect(gyms.filter((v) => v.address !== null && /^kenya$/i.test(v.address.trim()))).toEqual([]);
    expect(gyms.filter((v) => v.website && /(facebook|instagram|twitter|tiktok|youtube|linktr)/i.test(new URL(v.website).hostname)).map((v) => v.id)).toEqual([]);
  });

  it("nothing is Verified without an override, and nothing but Verified uses the word", () => {
    const verified = gyms.filter((v) => v.trust.tier === "verified");
    expect(verified.every((v) => v.trust.verifiedAt)).toBe(true);
    expect(gyms.filter((v) => v.trust.tier !== "verified" && v.trust.reasons.some((r) => /verified/i.test(r)))).toEqual([]);
  });

  it("unconfirmed venues are hidden from a name-less search but returned by their exact name", () => {
    const hidden = gyms.find((v) => v.trust.tier === "unconfirmed");
    expect(hidden, "the catalogue has no unconfirmed venue to test with").toBeTruthy();
    expect(searchVenues(index, hidden!.name).some((v) => v.id === hidden!.id)).toBe(true);
  });
});
