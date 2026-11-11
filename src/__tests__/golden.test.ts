import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MiniSearch from "minisearch";
import { describe, expect, it } from "vitest";
import type { Venue } from "../data/types";

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
