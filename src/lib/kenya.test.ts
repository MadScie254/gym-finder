import { describe, expect, it } from "vitest";
import { haversineKm, isInKenya, nearestCounty, pointToSegmentKm } from "./kenya";

describe("kenya geo", () => {
  it("accepts Nairobi and rejects Kampala", () => {
    expect(isInKenya({ lat: -1.286, lng: 36.817 })).toBe(true);
    expect(isInKenya({ lat: 0.3476, lng: 32.5825 })).toBe(false);
  });

  it("measures a short Nairobi hop", () => {
    const km = haversineKm({ lat: -1.286, lng: 36.817 }, { lat: -1.292, lng: 36.822 });
    expect(km).toBeGreaterThan(0.5);
    expect(km).toBeLessThan(2);
  });

  it("assigns Nairobi CBD to Nairobi county", () => {
    expect(nearestCounty({ lat: -1.286, lng: 36.817 }).name).toBe("Nairobi");
  });

  it("measures distance to a segment", () => {
    const along = pointToSegmentKm(
      { lat: -1.29, lng: 36.82 },
      { lat: -1.28, lng: 36.81 },
      { lat: -1.30, lng: 36.83 },
    );
    expect(along).toBeGreaterThanOrEqual(0);
    expect(along).toBeLessThan(2);
  });
});
