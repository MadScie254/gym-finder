import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assemble } from "./assemble.mjs";
import { hasOfficialEvidence, loadResearch, researchStatus, researchToRecords } from "./import-research.mjs";
import { normalizeOverture } from "./normalize.mjs";
import { computeTrust } from "./trust.mjs";

const AS_OF = "2026-10-13";
const KILIMANI = { lat: -1.29797, lng: 36.78809 };
const north = (metres: number) => metres * 9e-6;

const overture = (id: string, name: string, over: Record<string, unknown> = {}) => {
  const result = normalizeOverture({
    id, name, tax: "gym", basic: "gym", confidence: 0.6, addr: null, locality: "Nairobi", region: null, country: "KE",
    phones: ["+254722000111"], websites: ["https://alphafit.co.ke/"], socials: [],
    sources: [{ property: "", dataset: "meta", update_time: "2026-09-14T00:00:00.000Z" }],
    lat: KILIMANI.lat + north(300), lng: KILIMANI.lng, ...over,
  });
  if (!result.record) throw new Error("fixture rejected");
  return result.record;
};

const researched = (over: Record<string, unknown> = {}) => ({
  id: "web:alpha-fit-kilimani", name: "Alpha Fit Kilimani", kind: "gym", county: "Nairobi", town: "Nairobi", area: "Kilimani",
  address: null, phones: ["0722 000 111"], website: null, social: [], hoursText: null, access: "open to the public",
  status: "open", inSeed: false, seedId: null, verifiedAt: "2026-10-12",
  evidence: [{ url: "https://www.kenyabuzz.com/best-gyms", fetched: true, quote: "Alpha Fit, Kilimani, 0722 000 111", supports: ["phone"] }],
  notes: "", ...over,
});

const run = (venues: object[], records: object[], extra: Record<string, unknown> = {}) => {
  const research = researchToRecords({ generatedAt: "2026-10-13T08:00:00Z", venues }, { asOf: AS_OF });
  const assembled = assemble([...records, ...research.records], extra);
  const tiered = assembled.venues.map((venue: any) => ({ ...venue, trust: computeTrust(venue, undefined, { asOf: AS_OF }) }));
  return { research, assembled, venues: tiered };
};

const dirs: string[] = [];
afterEach(() => { while (dirs.length) rmSync(dirs.pop() as string, { recursive: true, force: true }); });

describe("the research file is optional", () => {
  it("loadResearch returns null when the file does not exist, so the build runs without it", () => {
    expect(loadResearch(path.join(os.tmpdir(), "fmg-no-such-research.json"))).toBeNull();
    expect(run([], [overture("a1", "Alpha Fit")]).venues).toHaveLength(1);
  });

  it("reads a valid file and fails loudly on a broken one", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "fmg-research-"));
    dirs.push(dir);
    const good = path.join(dir, "ok.json");
    writeFileSync(good, JSON.stringify({ generatedAt: "2026-10-13", venues: [] }));
    expect(loadResearch(good)?.venues).toEqual([]);
    const bad = path.join(dir, "bad.json");
    writeFileSync(bad, "{ nope");
    expect(() => loadResearch(bad)).toThrow(/not valid JSON/);
    const wrong = path.join(dir, "wrong.json");
    writeFileSync(wrong, JSON.stringify({ venues: "x" }));
    expect(() => loadResearch(wrong)).toThrow(/expected/);
  });
});

describe("matching an existing OSM/Overture record", () => {
  it("merges on the same phone; unofficial evidence adds data and URLs but not a source", () => {
    const { venues } = run([researched({ hoursText: "Mon-Fri 6am-9pm", website: null })], [overture("a1", "Alpha Fit")]);
    expect(venues).toHaveLength(1);
    const [venue] = venues;
    expect(venue.id).toBe("gers:a1");
    expect(venue.aliases).toContain("web:alpha-fit-kilimani");
    expect(venue.sources).toEqual(["overture"]);
    expect(venue.trust.tier).toBe("listed");
    expect(venue.hours).toEqual({ raw: "Mon-Fri 6am-9pm", source: "web" });
    expect(venue.provenance.hours).toBe("web");
    expect(venue.provenance.evidence).toBe("https://www.kenyabuzz.com/best-gyms");
    expect(venue.name).toBe("Alpha Fit"); // the existing record's name and location win
    expect(venue.lat).toBeCloseTo(KILIMANI.lat + north(300), 6);
  });

  it("an evidence page that is the venue's own website is an additional independent source", () => {
    const { venues } = run([
      researched({
        website: "https://alphafit.co.ke/",
        evidence: [{ url: "https://alphafit.co.ke/contact", fetched: true, quote: "Call us on 0722 000 111", supports: ["phone", "existence"] }],
      }),
    ], [overture("a1", "Alpha Fit")]);
    expect(venues[0].sources).toEqual(["overture", "web"]);
    expect(venues[0].trust.tier).toBe("corroborated");
    expect(venues[0].trust.reasons[0]).toMatch(/Official page found in web research on 12 Oct 2026/);
  });

  it("an official social profile counts, and so do its sub-pages", () => {
    const { venues } = run([
      researched({
        social: ["https://www.facebook.com/alphafitke"],
        evidence: [{ url: "https://m.facebook.com/alphafitke/about", fetched: true, quote: "Alpha Fit Kilimani", supports: ["existence"] }],
      }),
    ], [overture("a1", "Alpha Fit", { websites: [] })]);
    expect(venues[0].sources).toEqual(["overture", "web"]);
    expect(venues[0].facebook).toBe("https://www.facebook.com/alphafitke");
  });

  it("directories, listicles, unfetched or quote-less pages never count as official", () => {
    const urls = { website: "https://alphafit.co.ke/", facebook: null, instagram: null };
    const entry = (over: object) => [{ url: "https://alphafit.co.ke/", fetched: true, quote: "x", ...over }];
    expect(hasOfficialEvidence(entry({}), urls)).toBe(true);
    expect(hasOfficialEvidence(entry({ url: "https://www.kenyabuzz.com/alphafit" }), urls)).toBe(false);
    expect(hasOfficialEvidence(entry({ fetched: false }), urls)).toBe(false);
    expect(hasOfficialEvidence(entry({ quote: "  " }), urls)).toBe(false);
    expect(hasOfficialEvidence(entry({ url: "https://www.facebook.com/sharer/sharer.php?u=alphafit" }), { ...urls, facebook: "https://www.facebook.com/alphafitke" })).toBe(false);
    expect(hasOfficialEvidence([], urls)).toBe(false);
  });

  it("merges on the seed link even when nothing else agrees", () => {
    const { venues } = run([researched({ name: "Totally Different", phones: [], inSeed: true, seedId: "a1" })], [overture("a1", "Alpha Fit")]);
    expect(venues).toHaveLength(1);
    expect(venues[0].id).toBe("gers:a1");
  });

  it("merges on name within the area's 2 km, but not the same name 5 km away", () => {
    const record = { phones: [], websites: [] };
    const near = run([researched({ phones: [] })], [overture("a1", "Alpha Fit", record)]);
    expect(near.venues).toHaveLength(1);
    const far = run([researched({ phones: [] })], [overture("a1", "Alpha Fit", { ...record, lat: KILIMANI.lat + north(5000) })]);
    expect(far.venues).toHaveLength(2);
  });

  describe("one web finding joins at most one venue", () => {
    // Two branches of a chain, 2.5 km apart, sharing a phone: two venues, never one.
    const branches = () => [
      overture("s1", "Smart Gyms Junction", { websites: [] }),
      overture("s2", "Smart Gyms Westlands", { websites: [], lat: KILIMANI.lat - north(2200) }),
    ];

    it("a finding that matches two venues equally well is left out and logged, never fusing them", () => {
      const { venues, assembled } = run([researched({ id: "web:smart", name: "Smart Gyms" })], branches());
      expect(venues.map((v: any) => v.id)).toEqual(["gers:s1", "gers:s2"]);
      expect(venues.every((v: any) => v.aliases.length === 0)).toBe(true);
      expect(assembled.researchAmbiguous).toMatchObject([{ id: "web:smart", reason: "phone", candidates: ["gers:s1", "gers:s2"], closed: false }]);
    });

    it("joins the one whose name agrees best", () => {
      const { venues, assembled } = run([researched({ id: "web:smart-w", name: "Smart Gyms Westlands" })], branches());
      expect(venues).toHaveLength(2);
      expect(venues.find((v: any) => v.id === "gers:s2").aliases).toEqual(["web:smart-w"]);
      expect(venues.find((v: any) => v.id === "gers:s1").aliases).toEqual([]);
      expect(assembled.researchAmbiguous).toEqual([]);
    });

    it("an ambiguous closed finding closes nothing", () => {
      const { venues, assembled } = run([researched({ id: "web:smart", name: "Smart Gyms", status: "closed" })], branches());
      expect(venues).toHaveLength(2);
      expect(assembled.researchClosed).toEqual([]);
      expect(assembled.researchAmbiguous[0]).toMatchObject({ id: "web:smart", closed: true });
    });

    it("a seed link beats a shared phone", () => {
      const { venues } = run([researched({ id: "web:smart", name: "Smart Gyms", inSeed: true, seedId: "gers:s1" })], branches());
      expect(venues.find((v: any) => v.id === "gers:s1").aliases).toEqual(["web:smart"]);
    });
  });

  it("web research fills gaps only: it never overrides OSM/Overture values or adds a second phone from an unofficial page", () => {
    const { venues } = run([researched({ phones: ["0722 000 111", "0733 999 888"], website: "https://other.example.co.ke" })], [overture("a1", "Alpha Fit")]);
    expect(venues[0].phones).toEqual(["+254722000111"]);
    expect(venues[0].website).toBe("https://alphafit.co.ke/");
  });
});

describe("a researched venue that matches nothing", () => {
  const unmatched = () => run([
    researched({
      id: "web:peak-fitness-kilimani", name: "Peak Fitness Kilimani", phones: ["0711 222 333"], website: "https://peakfitness.co.ke/",
      hoursText: "Daily 5am-10pm", access: "Women only",
      evidence: [{ url: "https://peakfitness.co.ke/", fetched: true, quote: "Peak Fitness, Kilimani", supports: ["existence"] }],
    }),
  ], [overture("a1", "Alpha Fit", { phones: ["+254700555666"], websites: [] })]);

  it("enters as listed, never corroborated, even with official evidence", () => {
    const venue = unmatched().venues.find((v: any) => v.id === "web:peak-fitness-kilimani");
    expect(venue).toBeTruthy();
    expect(venue.sources).toEqual(["web"]);
    expect(venue.trust.tier).toBe("listed");
    expect(venue.trust.verifiedAt).toBeNull();
  });

  it("says in its reasons that it comes from web research, with the date", () => {
    const venue = unmatched().venues.find((v: any) => v.id === "web:peak-fitness-kilimani");
    expect(venue.trust.reasons[0]).toBe("Found by web research on 12 Oct 2026; not independently confirmed");
    expect(venue.trust.reasons.join(" ")).toMatch(/approximate: centre of Kilimani/);
    expect(venue.trust.reasons.join(" ")).not.toMatch(/verified/i);
  });

  it("keeps evidence URLs and per-field provenance, hours as raw web text, and an approximate location inside Kenya", () => {
    const venue = unmatched().venues.find((v: any) => v.id === "web:peak-fitness-kilimani");
    expect(venue.provenance).toMatchObject({ name: "web", location: "web:approx-area", phone: "web", website: "web", hours: "web", evidence: "https://peakfitness.co.ke/", researched: "2026-10-12" });
    expect(venue.hours).toEqual({ raw: "Daily 5am-10pm", source: "web" });
    expect(venue.phones).toEqual(["+254711222333"]);
    expect(venue.amenities).toEqual({ women_only: true });
    expect(venue.lat).toBeCloseTo(KILIMANI.lat, 4);
    expect(venue.county).toBe("Nairobi");
  });

  it("falls back to the town centre (flagged) when the area is unknown, and skips it when nothing places it", () => {
    const town = run([researched({ id: "web:t", area: "Nowhere Estate", town: "Nakuru", phones: ["0711 000 000"] })], []);
    expect(town.venues[0].provenance.location).toBe("web:approx-town");
    expect(town.venues[0].county).toBe("Nakuru");
    const none = run([researched({ id: "web:n", area: "Nowhere Estate", town: "Nowhere" })], []);
    expect(none.venues).toHaveLength(0);
    expect(none.research.skipped[0].reason).toMatch(/no coordinates and no area\/town/);
  });

  it("dedupes the same venue found twice", () => {
    const twice = run([researched({ id: "web:a" }), researched({ id: "web:b", name: "Alpha Fit" })], []);
    expect(twice.venues).toHaveLength(1);
  });
});

describe("closed, uncertain and invalid findings", () => {
  it("status closed removes the matching OSM/Overture record (by seed link or phone) and logs it", () => {
    const bySeed = run([researched({ status: "closed", inSeed: true, seedId: "gers:a1", phones: [] })], [overture("a1", "Alpha Fit")]);
    expect(bySeed.venues).toHaveLength(0);
    expect(bySeed.assembled.researchClosed).toMatchObject([{ ids: ["gers:a1"], names: ["Alpha Fit"] }]);
    const byPhone = run([researched({ status: "closed" })], [overture("a1", "Alpha Fit"), overture("b2", "Elsewhere Gym", { phones: ["+254700000001"], websites: [], lat: -1.2, lng: 36.9 })]);
    expect(byPhone.venues.map((v: any) => v.id)).toEqual(["gers:b2"]);
  });

  it("a closed finding that matches nothing adds nothing, even with no location", () => {
    const result = run([researched({ status: "closed", area: null, town: null })], [overture("a1", "Zeal Studio", { phones: ["+254700000009"], websites: [] })]);
    expect(result.venues.map((v: any) => v.id)).toEqual(["gers:a1"]);
    expect(result.assembled.researchClosed).toEqual([]);
  });

  it("an unlocated closed finding still removes a record it shares a phone with", () => {
    const result = run([researched({ status: "closed", area: null, town: null })], [overture("a1", "Alpha Fit")]);
    expect(result.venues).toHaveLength(0);
  });

  it("uncertain and unrecognised statuses are never imported", () => {
    for (const status of ["uncertain", "unknown", "temporarily closed", "", null, "maybe open", "operating (unverified)", "open?", "likely operating", "moved"]) {
      const result = run([researched({ status })], []);
      expect(result.venues, String(status)).toHaveLength(0);
      expect(result.research.counts.uncertain).toBe(1);
    }
    expect(researchStatus("open")).toBe("open");
    expect(researchStatus("operating")).toBe("open");
    expect(researchStatus("Open")).toBe("open");
    expect(researchStatus("closed")).toBe("closed");
    expect(researchStatus("permanently closed")).toBe("closed");
  });

  it("skips malformed entries and says why", () => {
    const result = run([{ id: "web:x" }, researched({ name: "" }), researched()], []);
    expect(result.research.counts).toMatchObject({ total: 3, invalid: 2, imported: 1 });
  });

  it("does not resurrect a venue the deny-list or an exclude already removed", () => {
    const removed = { ...overture("z9", "Alpha Supplements"), removedBy: "denylist" };
    const result = run([researched({ phones: ["+254722000111"] })], [], { tombstones: [removed], ghosts: [removed] });
    expect(result.venues).toHaveLength(0);
    expect(result.assembled.researchBlocked).toMatchObject([{ matched: "gers:z9", removedBy: "denylist" }]);
  });
});
