import { describe, expect, it } from "vitest";
import { computeTrust, formatDay, formatMonth } from "./trust.mjs";

const AS_OF = "2026-10-13";
const base = { name: "Test Gym", phones: [] as string[], website: null as string | null, overtureConfidence: null as number | null };
const trust = (venue: object, override?: object) => computeTrust({ ...base, ...venue }, override, { asOf: AS_OF });

describe("trust tiers (brief 5.5)", () => {
  const table: [string, object, object | undefined, string][] = [
    ["override verified 1 month ago", { sources: ["osm"], lastSeen: null }, { verifiedAt: "2026-09-13", verification: "phone" }, "verified"],
    ["override verified exactly 12 months ago", { sources: ["osm"], lastSeen: null }, { verifiedAt: "2025-10-13", verification: "visit" }, "verified"],
    ["override verified 13 months ago is not verified", { sources: ["osm"], lastSeen: null }, { verifiedAt: "2025-09-01", verification: "visit" }, "listed"],
    ["override verified in the future is not verified", { sources: ["osm"], lastSeen: null }, { verifiedAt: "2026-11-01", verification: "phone" }, "listed"],
    ["closed override never verifies", { sources: ["osm"], lastSeen: null }, { verifiedAt: "2026-09-13", verification: "phone", closed: true }, "listed"],
    ["OSM + Overture, even at low confidence", { sources: ["osm", "overture"], overtureConfidence: 0.4, overtureUpdatedAt: "2026-09-14", lastSeen: "2026-09-14" }, undefined, "corroborated"],
    ["Overture 0.85 with phone, updated recently", { sources: ["overture"], overtureConfidence: 0.85, phones: ["+254700000000"], overtureUpdatedAt: "2026-09-14", lastSeen: "2026-09-14" }, undefined, "corroborated"],
    ["Overture 0.85 with website only", { sources: ["overture"], overtureConfidence: 0.9, website: "https://x.co.ke/", overtureUpdatedAt: "2026-09-14", lastSeen: "2026-09-14" }, undefined, "corroborated"],
    ["Overture 0.84 with phone is only listed", { sources: ["overture"], overtureConfidence: 0.84, phones: ["+254700000000"], overtureUpdatedAt: "2026-09-14", lastSeen: "2026-09-14" }, undefined, "listed"],
    ["Overture 0.95 without phone or website is only listed", { sources: ["overture"], overtureConfidence: 0.95, overtureUpdatedAt: "2026-09-14", lastSeen: "2026-09-14" }, undefined, "listed"],
    ["Overture 0.95 with phone but updated 25 months ago is only listed", { sources: ["overture"], overtureConfidence: 0.95, phones: ["+254700000000"], overtureUpdatedAt: "2024-09-01", lastSeen: "2024-09-01" }, undefined, "listed"],
    ["Overture 0.5 recent", { sources: ["overture"], overtureConfidence: 0.5, overtureUpdatedAt: "2026-09-14", lastSeen: "2026-09-14" }, undefined, "listed"],
    ["Overture 0.49 is unconfirmed", { sources: ["overture"], overtureConfidence: 0.49, overtureUpdatedAt: "2026-09-14", lastSeen: "2026-09-14" }, undefined, "unconfirmed"],
    ["Overture 0.7 but updated 37 months ago is unconfirmed", { sources: ["overture"], overtureConfidence: 0.7, overtureUpdatedAt: "2023-09-01", lastSeen: "2023-09-01" }, undefined, "unconfirmed"],
    ["named OSM gym, no date", { sources: ["osm"], lastSeen: null }, undefined, "listed"],
    ["named OSM gym checked 2 years ago", { sources: ["osm"], osmUpdatedAt: "2024-10-01", lastSeen: "2024-10-01" }, undefined, "listed"],
    ["OSM gym last checked 4 years ago", { sources: ["osm"], osmUpdatedAt: "2022-01-01", lastSeen: "2022-01-01" }, undefined, "unconfirmed"],
    ["web research alone is listed, never corroborated", { sources: ["web"], lastSeen: "2026-10-13", web: { researchAt: "2026-10-13", official: true } }, undefined, "listed"],
    ["web official evidence + Overture is a second source", { sources: ["overture", "web"], overtureConfidence: 0.6, overtureUpdatedAt: "2026-09-14", lastSeen: "2026-10-13", web: { researchAt: "2026-10-13", official: true } }, undefined, "corroborated"],
    ["name that reads as a hotel is capped at unconfirmed", { sources: ["overture"], overtureConfidence: 0.95, phones: ["+254700000000"], overtureUpdatedAt: "2026-09-14", lastSeen: "2026-09-14", softDeny: "hotel" }, undefined, "unconfirmed"],
  ];
  for (const [label, venue, override, tier] of table) {
    it(`${label} -> ${tier}`, () => {
      expect(trust(venue, override).tier).toBe(tier);
    });
  }

  it("verified carries verifiedAt and says who confirmed; nothing else uses the word", () => {
    const verified = trust({ sources: ["osm"], lastSeen: null }, { verifiedAt: "2026-09-13", verification: "phone" });
    expect(verified.verifiedAt).toBe("2026-09-13");
    expect(verified.reasons[0]).toBe("Confirmed by Find My Gym by phone on 13 Sep 2026");
    for (const venue of [
      { sources: ["osm", "overture"], lastSeen: "2026-09-14", overtureDatasets: ["meta"] },
      { sources: ["overture"], overtureConfidence: 0.7, overtureUpdatedAt: "2026-09-14", lastSeen: "2026-09-14" },
      { sources: ["web"], lastSeen: "2026-10-13", web: { researchAt: "2026-10-13", official: false } },
      { sources: ["overture"], overtureConfidence: 0.2, lastSeen: "2026-09-14" },
    ]) {
      const result = trust(venue);
      expect(result.verifiedAt).toBeNull();
      expect(result.reasons.join(" ")).not.toMatch(/verified/i);
    }
  });

  it("flags stale after 24 months and says so", () => {
    const old = trust({ sources: ["overture"], overtureConfidence: 0.7, overtureUpdatedAt: "2024-06-01", lastSeen: "2024-06-01" });
    expect(old.stale).toBe(true);
    expect(old.reasons.join(" ")).toMatch(/May be outdated/);
    expect(trust({ sources: ["overture"], overtureConfidence: 0.7, overtureUpdatedAt: "2026-09-14", lastSeen: "2026-09-14" }).stale).toBe(false);
    expect(trust({ sources: ["osm"], lastSeen: null }).stale).toBe(false); // unknown is not "old"
  });

  it("reasons name the sources, contact and date like the brief's example", () => {
    const result = trust({
      sources: ["osm", "overture"],
      overtureDatasets: ["meta"],
      phones: ["+254724240000"],
      website: "http://www.level24.life/",
      lastSeen: "2026-09-14",
    });
    expect(result.reasons).toEqual([
      "Seen in OpenStreetMap and Overture Maps (Meta business data)",
      "Phone and website listed",
      "Updated Sep 2026",
    ]);
  });

  it("web-only reasons say it comes from web research, with the date", () => {
    const result = trust({ sources: ["web"], lastSeen: "2026-10-13", web: { researchAt: "2026-10-13", official: false }, approxRadiusM: 2000, area: "Kilimani" });
    expect(result.reasons[0]).toBe("Found by web research on 13 Oct 2026; not independently confirmed");
    expect(result.reasons.join(" ")).toMatch(/Map pin is approximate: centre of Kilimani/);
  });

  it("is a pure function of its inputs: score stays internal and bounded", () => {
    const venue = { sources: ["osm", "overture"], overtureConfidence: 0.99, phones: ["+254700000000"], website: "https://a.co.ke/", lastSeen: "2026-09-14", overtureUpdatedAt: "2026-09-14" };
    expect(trust(venue)).toEqual(trust(venue));
    expect(trust(venue).score).toBeLessThanOrEqual(100);
    expect(trust({ sources: ["overture"], overtureConfidence: 0.1, lastSeen: "2026-09-14" }).score).toBeGreaterThanOrEqual(0);
  });

  it("formats dates without locale surprises", () => {
    expect(formatDay("2026-10-05")).toBe("5 Oct 2026");
    expect(formatMonth("2026-09-14")).toBe("Sep 2026");
  });
});
