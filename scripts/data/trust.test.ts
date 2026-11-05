import { describe, expect, it } from "vitest";
import { computeTrust } from "./trust.mjs";

describe("trust tiers", () => {
  it("only uses Verified from a fresh override", () => {
    const trust = computeTrust(
      { name: "Test Gym", sources: ["osm"], lastSeen: "2026-01-01", phones: [] },
      { verifiedAt: "2026-09-01" },
    );
    expect(trust.tier).toBe("verified");
    expect(trust.verifiedAt).toBe("2026-09-01");
  });

  it("marks dual-source venues corroborated", () => {
    const trust = computeTrust({
      name: "Level 24",
      sources: ["osm", "overture"],
      lastSeen: "2026-06-01",
      phones: ["+254700000000"],
      overtureConfidence: 0.4,
    });
    expect(trust.tier).toBe("corroborated");
  });

  it("lists a named OSM gym", () => {
    const trust = computeTrust({
      name: "EA Fitness",
      sources: ["osm"],
      lastSeen: "2025-01-01",
      phones: [],
    });
    expect(trust.tier).toBe("listed");
  });

  it("hides sparse old Overture as unconfirmed", () => {
    const trust = computeTrust({
      name: "Alpha Supplements",
      sources: ["overture"],
      lastSeen: "2022-01-01",
      phones: [],
      overtureConfidence: 0.2,
    });
    expect(trust.tier).toBe("unconfirmed");
  });
});
