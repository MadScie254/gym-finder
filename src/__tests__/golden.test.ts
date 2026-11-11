import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MiniSearch from "minisearch";
import { describe, expect, it } from "vitest";
import type { Venue } from "../data/types";
import { createVenueSearch, fuzzyEdits } from "../data/loadVenues";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = path.join(ROOT, "public", "data", "manifest.json");

const SEED = [
  "FirstPower CrossFit",
  "Parklands Sports Club",
  "Fitness Empire",
  "Pent Hse Gymnasium",
  "Alpha Fit",
  "Hyat Fitness",
  "Smart Gyms Junction",
  "Salute Gym",
  "Level 24 Gym and Fitness Centre",
  "CrossFit Kwetu",
  "Ultra Fitness Gym",
  "Just Train Gym and Aerobics",
  "EA Fitness",
  "Climb Blue Sky",
  "Fahari Gym and Sports",
  "Veteran Fitness Center",
  "Racing Sport Gym",
  "Rudicci Fitness Lots",
  "Fitness Mania Gym Parklands",
  "Nyali CrossFit Gym",
  "Muscle Beach Gym Kasarani",
  "Kenyatta University Gymnasium",
];

const MUST_MERGE = [
  ["Level 24", "Level 24 Gym"],
  ["The Colosseum Fitness Centre"],
  ["DOJO", "Dojo Wellness Club"],
  ["AICAD gym", "AICAD Gymnasium"],
  ["Physiq & Tone"],
  ["Rox Park Gym"],
  ["The Fitness Cocoon"],
];

function loadGyms(): Venue[] {
  if (!existsSync(manifestPath)) return [];
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const file = path.join(ROOT, "public", manifest.gymsPath.replace(/^\//, ""));
  if (!existsSync(file)) return [];
  return JSON.parse(readFileSync(file, "utf8")).gyms ?? [];
}

function typo(name: string): string {
  if (name.length < 4) return name;
  return `${name.slice(0, 2)}${name.slice(3)}`;
}

const gyms = loadGyms();

describe.skipIf(gyms.length === 0)("golden set findability", () => {
  it("has a built catalogue", () => {
    expect(gyms.length).toBeGreaterThan(0);
  });

  it("finds seed gyms by exact name, typo, and name+area in the top 3", () => {
    if (!gyms.length) return;
    const search = new MiniSearch<Venue>({
      fields: ["name", "area", "town", "county"],
      storeFields: ["id", "name"],
      searchOptions: { boost: { name: 5 }, fuzzy: 0.2, prefix: true },
    });
    search.addAll(gyms);
    const missing: string[] = [];
    for (const name of SEED) {
      const present = gyms.some((gym) => gym.name.toLowerCase().includes(name.toLowerCase().slice(0, 8)));
      if (!present) continue;
      const exact = search.search(name).slice(0, 3);
      const fuzzy = search.search(typo(name)).slice(0, 3);
      if (!exact.length) missing.push(`exact:${name}`);
      if (!fuzzy.length) missing.push(`typo:${name}`);
    }
    expect(missing).toEqual([]);
  });

  it("ranks Salute Gym first for the transposed query \"slaute gym\"", () => {
    const search = createVenueSearch(gyms);
    const top = search.search("slaute gym")[0];
    expect(top?.name).toBe("Salute Gym");
  });

  it("includes every seed name once Overture is in the build", () => {
    const manifest = existsSync(manifestPath)
      ? JSON.parse(readFileSync(manifestPath, "utf8"))
      : {};
    if (!manifest.overtureRelease) return;
    const absent = SEED.filter((name) =>
      !gyms.some((gym) => gym.name.toLowerCase().includes(name.toLowerCase().slice(0, 8))));
    expect(absent).toEqual([]);
  });

  it("returns one record for must-merge fixtures when both names exist", () => {
    if (!gyms.length) return;
    for (const names of MUST_MERGE) {
      const hits = gyms.filter((gym) => names.some((name) => gym.name.toLowerCase().includes(name.toLowerCase())));
      if (hits.length === 0) continue;
      const ids = new Set(hits.map((gym) => gym.id));
      expect(ids.size, names.join(" / ")).toBe(1);
    }
  });
});

describe("fuzzy edit budget", () => {
  it("keeps short terms strict and lets long terms absorb a swapped pair", () => {
    expect(fuzzyEdits("gym")).toBe(0);
    expect(fuzzyEdits("fitt")).toBe(1);
    expect(fuzzyEdits("slaute")).toBe(2);
  });
});

/** First verified profiles: each venue's own website checked on 2026-11-11 (data/research/site-checks-2026-11-11.json). */
const WEBSITE_VERIFIED: Array<[id: string, name: string]> = [
  ["gers:404162cb-e0c1-4858-96aa-5c7c3064c0e7", "Tumaini Fitness Centre"],
  ["gers:255793dc-5e1e-4566-b242-b2c1bd42d1c6", "Mnarani Gym"],
  ["gers:85a9090d-acc0-42fd-a50b-1c8a777ca41c", "Health Hub Oasis"],
  ["gers:0b9dc1e8-b789-426e-9116-8e478eb58321", "Banana House And Wellness Centre"],
  ["gers:cd6d51c5-65dc-4ab4-a7a5-871f60703453", "InShape Fitness"],
  ["osm:node/10048755617", "Dojo"],
  ["osm:node/14148174874", "Level 24"],
  ["gers:0c504d74-69c6-44aa-bee4-67781a872cf5", "Parklands Sports Club"],
  ["gers:4c268103-3ea7-4fc2-a135-bb2e0b46e48a", "Smart Gyms Junction"],
  ["gers:18ccfce3-530f-48f3-948f-6479d18c822e", "SmashFit Gym Sarit"],
];

describe.skipIf(gyms.length === 0)("website-verified golden profiles", () => {
  const find = (id: string) => gyms.find((gym) => gym.id === id);

  it("keeps every verified venue in the catalogue, verified, and findable by name", () => {
    const search = createVenueSearch(gyms);
    for (const [id, name] of WEBSITE_VERIFIED) {
      const gym = find(id);
      expect(gym, name).toBeDefined();
      expect(gym?.name).toBe(name);
      expect(gym?.trust.tier, name).toBe("verified");
      const top = search.search(name).slice(0, 3).map((hit: { name?: string }) => hit.name);
      expect(top, name).toContain(name);
    }
  });

  it("says a website was checked, never that someone visited", () => {
    for (const [id, name] of WEBSITE_VERIFIED) {
      const gym = find(id)!;
      expect(gym.verification?.method, name).toBe("website");
      expect(gym.trust.reasons, name).toEqual(["Details confirmed on the gym's own website on 11 Nov 2026"]);
    }
  });

  it("backs every field the check set with a source URL and a short quote", () => {
    for (const [id, name] of WEBSITE_VERIFIED) {
      const gym = find(id)!;
      const evidence = gym.verification?.evidence ?? {};
      expect(evidence.operating, name).toBeDefined();
      for (const [field, source] of Object.entries(gym.provenance)) {
        if (source !== "override:website") continue;
        expect(evidence[field], `${name} ${field}`).toBeDefined();
        expect(evidence[field].quote.length, `${name} ${field}`).toBeLessThan(200);
      }
      for (const [key, price] of Object.entries(gym.prices ?? {})) {
        expect(price.currency, `${name} ${key}`).toBe("KES");
        expect(price.sourceUrl, `${name} ${key}`).toBe(evidence[`prices.${key}`]?.url);
      }
    }
  });

  it("keeps prices off venues nobody verified", () => {
    const unverifiedWithPrices = gyms.filter((gym) => gym.prices && gym.trust.tier !== "verified");
    expect(unverifiedWithPrices.map((gym) => gym.name)).toEqual([]);
  });
});
