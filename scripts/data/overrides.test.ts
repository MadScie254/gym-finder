import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { OSM_HOURS, VenueOverride, loadVenueOverrides, verificationReason } from "./overrides.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VENUES = path.join(ROOT, "data", "overrides", "venues");

const URL = "https://example-gym.co.ke/";
const base = {
  id: "gers:test",
  verifiedAt: "2026-11-11",
  verification: "website",
  set: { hours: "Mo-Fr 05:00-22:00", hoursText: "Monday to Friday 5am to 10pm" },
  evidence: {
    operating: { url: URL, quote: "© 2026 Example Gym" },
    hours: { url: URL, quote: "Monday to Friday 5am to 10pm" },
  },
};

describe("venue override schema", () => {
  it("accepts a website check with evidence for every field", () => {
    expect(VenueOverride.safeParse(base).success).toBe(true);
  });

  it("rejects a set field without evidence", () => {
    const body = { ...base, set: { ...base.set, phone: "+254700000000" } };
    const parsed = VenueOverride.safeParse(body);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0].message).toContain("missing evidence for phone");
  });

  it("rejects an amenity or price without its own evidence", () => {
    const amenity = { ...base, set: { ...base.set, amenities: { pool: true } } };
    expect(VenueOverride.safeParse(amenity).success).toBe(false);
    const price = {
      ...base,
      set: {
        ...base.set,
        prices: { monthly: { amount: 5000, currency: "KES", period: "month", text: "Ksh 5000/month", asOf: null } },
      },
    };
    expect(VenueOverride.safeParse(price).success).toBe(false);
  });

  it("rejects a website check without operating evidence", () => {
    const { operating: _operating, ...evidence } = base.evidence;
    expect(VenueOverride.safeParse({ ...base, evidence }).success).toBe(false);
  });

  it("rejects prices without a currency or with an unknown period", () => {
    const price = (value: Record<string, unknown>) => VenueOverride.safeParse({
      ...base,
      set: { ...base.set, prices: { monthly: value } },
      evidence: { ...base.evidence, "prices.monthly": { url: URL, quote: "Ksh 5000/month" } },
    }).success;
    expect(price({ amount: 5000, currency: "KES", period: "month", text: "Ksh 5000/month", asOf: "2026-11-11" })).toBe(true);
    expect(price({ amount: 5000, period: "month", text: "5000", asOf: null })).toBe(false);
    expect(price({ amount: 5000, currency: "KES", period: "week", text: "Ksh 5000", asOf: null })).toBe(false);
  });

  it("only takes OSM opening_hours in hours and needs the wording it came from", () => {
    expect(OSM_HOURS.test("Mo-Fr 05:00-22:00; Sa 07:00-20:00")).toBe(true);
    expect(OSM_HOURS.test("Mo-Fr 06:30-12:00,15:30-19:00; Sa 06:30-12:00")).toBe(true);
    expect(OSM_HOURS.test("Mon-Sat 5am - 10pm")).toBe(false);
    expect(VenueOverride.safeParse({ ...base, set: { hours: "Daily 6PM – 8PM" } }).success).toBe(false);
    expect(VenueOverride.safeParse({ ...base, set: { hours: "Mo-Fr 05:00-22:00" } }).success).toBe(false);
  });

  it("caps quotes under 200 characters and rejects unknown keys", () => {
    const long = { ...base, evidence: { ...base.evidence, operating: { url: URL, quote: "x".repeat(200) } } };
    expect(VenueOverride.safeParse(long).success).toBe(false);
    expect(VenueOverride.safeParse({ ...base, rating: 4.5 }).success).toBe(false);
    expect(VenueOverride.safeParse({ ...base, set: { ...base.set, rating: 4.5 } }).success).toBe(false);
  });

  it("says exactly what was checked", () => {
    expect(verificationReason("website", "2026-11-11")).toBe("Details confirmed on the gym's own website on 11 Nov 2026");
    expect(verificationReason("website", "2026-11-11")).not.toMatch(/visit/i);
  });

  it("fails the load on a bad file", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "overrides-"));
    writeFileSync(path.join(dir, "bad.json"), JSON.stringify({ ...base, evidence: {} }));
    await expect(loadVenueOverrides(dir)).rejects.toThrow(/bad\.json/);
  });
});

describe("committed venue overrides", () => {
  const files = readdirSync(VENUES).filter((file) => file.endsWith(".json"));

  it("all validate and carry a website check dated 2026-11-11", async () => {
    const loaded = await loadVenueOverrides(VENUES);
    expect(Object.keys(loaded).length).toBe(files.length);
    for (const file of files) {
      const body = JSON.parse(readFileSync(path.join(VENUES, file), "utf8"));
      expect(body.verification, file).toBe("website");
      expect(body.verifiedAt, file).toBe("2026-11-11");
    }
  });

  it("never cite maps, social or directory sites as evidence", () => {
    const banned = /google\.|goo\.gl|facebook\.com|instagram\.com|tripadvisor|yelp|cybo|kenyabiz|yellowpages|businesslist/i;
    for (const file of files) {
      const body = JSON.parse(readFileSync(path.join(VENUES, file), "utf8"));
      for (const [key, item] of Object.entries(body.evidence as Record<string, { url: string }>)) {
        expect(banned.test(item.url), `${file} ${key}`).toBe(false);
      }
    }
  });
});
