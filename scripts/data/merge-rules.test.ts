import { describe, expect, it } from "vitest";
import { isProximityOnlyCandidate, shouldMerge, tokenJaccard } from "./merge-rules.mjs";

const aicadOsm = { id: "osm:node/1", name: "AICAD gym", lat: -1.3, lng: 36.8, phones: [], website: null };
const aicadOv = { id: "gers:abc", name: "AICAD Gymnasium", lat: -1.3002, lng: 36.8001, phones: [], website: null };
const fahari = { id: "osm:node/2", name: "Fahari Gym and Sports", lat: -1.27, lng: 36.81, phones: [], website: null };
const samnick = { id: "gers:x", name: "Samnick Enterprises", lat: -1.2701, lng: 36.8101, phones: [], website: null };

describe("merge rules", () => {
  it("merges AICAD on name+distance", () => {
    expect(shouldMerge(aicadOsm, aicadOv).merge).toBe(true);
    expect(tokenJaccard("AICAD gym", "AICAD Gymnasium")).toBeGreaterThanOrEqual(0.5);
  });

  it("does not auto-merge Fahari and Samnick", () => {
    expect(shouldMerge(fahari, samnick).merge).toBe(false);
    expect(isProximityOnlyCandidate(fahari, samnick)).toBe(true);
  });

  it("merges on the same phone", () => {
    expect(shouldMerge(
      { ...aicadOsm, phones: ["+254700000001"] },
      { ...samnick, phones: ["+254700000001"] },
    ).merge).toBe(true);
  });
});
