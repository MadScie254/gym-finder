import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyOverride, loadOverrides, matchesKnownClosed, overrideFor } from "./overrides.mjs";

const dirs: string[] = [];
function overridesDir(files: Record<string, unknown>) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "fmg-overrides-"));
  dirs.push(dir);
  for (const [name, body] of Object.entries(files)) {
    const file = path.join(dir, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, typeof body === "string" ? body : JSON.stringify(body));
  }
  return dir;
}
afterEach(() => { while (dirs.length) rmSync(dirs.pop() as string, { recursive: true, force: true }); });

describe("override files are validated with Zod", () => {
  it("loads empty arrays and a missing directory as nothing", () => {
    const empty = loadOverrides(overridesDir({ "exclude.json": [], "merge.json": [], "known-closed.json": [], "allow.json": [] }));
    expect(empty.exclude).toEqual([]);
    expect(empty.venues.size).toBe(0);
    expect(loadOverrides(path.join(os.tmpdir(), "fmg-does-not-exist")).merge).toEqual([]);
  });

  it("loads valid exclude, allow, merge, known-closed and venue files", () => {
    const loaded = loadOverrides(overridesDir({
      "exclude.json": [{ id: "gers:abc", reason: "supplements shop" }],
      "allow.json": [{ id: "gers:def", reason: "real gym with SEO name" }],
      "merge.json": [{ a: "osm:node/1", b: "gers:abc", reason: "same premises" }],
      "known-closed.json": ["Old Gym", { name: "Other Gym", area: "Kilimani" }],
      "venues/level-24-1234.json": { id: "osm:node/1", verifiedAt: "2026-10-20", verification: "phone", set: { phone: "0722784664", hours: "Mo-Su 06:00-21:00" } },
    }));
    expect(loaded.exclude).toHaveLength(1);
    expect(loaded.venues.get("osm:node/1")?.verification).toBe("phone");
    expect(loaded.knownClosed).toHaveLength(2);
  });

  const invalid: [string, Record<string, unknown>, RegExp][] = [
    ["exclude.json must be an array", { "exclude.json": { id: "x" } }, /exclude\.json/],
    ["exclude entries need a reason", { "exclude.json": [{ id: "gers:abc" }] }, /reason/],
    ["unknown keys are rejected", { "exclude.json": [{ id: "gers:abc", reason: "no", extra: 1 }] }, /exclude\.json/],
    ["a merge pair needs two different ids", { "merge.json": [{ a: "osm:node/1", b: "osm:node/1" }] }, /merge\.json/],
    ["verifiedAt needs verification", { "venues/a-1.json": { id: "osm:node/1", verifiedAt: "2026-10-20" } }, /verification/],
    ["verifiedAt must be an ISO date", { "venues/a-1.json": { id: "osm:node/1", verifiedAt: "20 Oct", verification: "phone" } }, /a-1\.json/],
    ["verification must be phone | visit | owner", { "venues/a-1.json": { id: "osm:node/1", verifiedAt: "2026-10-20", verification: "guess" } }, /a-1\.json/],
    ["set rejects unknown fields", { "venues/a-1.json": { id: "osm:node/1", set: { rating: 5 } } }, /a-1\.json/],
    ["malformed JSON", { "known-closed.json": "[oops" }, /not valid JSON/],
  ];
  for (const [label, files, message] of invalid) {
    it(`fails the build: ${label}`, () => {
      expect(() => loadOverrides(overridesDir(files))).toThrow(message);
    });
  }
});

describe("applying overrides", () => {
  const venue = {
    id: "osm:node/1", name: "Level 24", phones: ["+254733758380"], website: null, instagram: null, whatsapp: null, address: null,
    hours: null, fee: null, amenities: {}, provenance: { name: "osm" },
  };

  it("normalises override phones to E.164, puts them first, and records provenance", () => {
    const { venue: out, warnings } = applyOverride(venue, { id: "osm:node/1", set: { phone: "0722 784 664", website: "https://level24.life", hours: "Mo-Su 06:00-21:00", fee: "free", amenities: { pool: true } } });
    expect(out.phones).toEqual(["+254722784664", "+254733758380"]);
    expect(out.website).toBe("https://level24.life/");
    expect(out.hours).toEqual({ raw: "Mo-Su 06:00-21:00", source: "override" });
    expect(out.fee).toBe("free");
    expect(out.amenities).toEqual({ pool: true });
    expect(out.provenance).toMatchObject({ name: "osm", phone: "override", website: "override", hours: "override" });
    expect(warnings).toEqual([]);
  });

  it("does not apply an invalid phone or a social URL as the website, and says so", () => {
    const { venue: out, warnings } = applyOverride(venue, { id: "osm:node/1", set: { phone: "12345", website: "https://www.facebook.com/level24" } });
    expect(out.phones).toEqual(["+254733758380"]);
    expect(out.website).toBeNull();
    expect(warnings).toHaveLength(2);
  });

  it("an explicit null address clears a wrong one", () => {
    expect(applyOverride({ ...venue, address: "Kenya" }, { id: "x", set: { address: null } }).venue.address).toBeNull();
  });

  it("finds an override by id or alias, so a closed tombstone survives a re-merge", () => {
    const venues = new Map([["gers:old", { id: "gers:old", closed: true }]]);
    expect(overrideFor(venues, { id: "osm:node/9", aliases: ["gers:old"] })?.closed).toBe(true);
    expect(overrideFor(venues, { id: "osm:node/9", aliases: [] })).toBeNull();
  });

  it("matches owner-reported closures by exact name, narrowed by area", () => {
    expect(matchesKnownClosed({ name: "Old  Gym!", area: null, town: null, county: "Nairobi" }, "old gym")).toBe(true);
    expect(matchesKnownClosed({ name: "Old Gym", area: "Kilimani", town: "Nairobi", county: "Nairobi" }, { name: "Old Gym", area: "kilimani" })).toBe(true);
    expect(matchesKnownClosed({ name: "Old Gym", area: "Westlands", town: "Nairobi", county: "Nairobi" }, { name: "Old Gym", area: "Kilimani" })).toBe(false);
    expect(matchesKnownClosed({ name: "Old Gym Plus", area: null, town: null, county: null }, "Old Gym")).toBe(false);
  });
});
