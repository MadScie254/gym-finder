import { describe, expect, it } from "vitest";
import { boundsOf, filterToBounds, inBounds, sameBounds } from "./viewport";

const westlands = { id: "w", lat: -1.264, lng: 36.803 };
const cbd = { id: "c", lat: -1.286, lng: 36.817 };
const kisumu = { id: "k", lat: -0.092, lng: 34.768 };
const nairobiView = { west: 36.7, south: -1.35, east: 36.9, north: -1.2 };

describe("viewport filtering", () => {
  it("keeps only points inside the map view, in order", () => {
    expect(filterToBounds([kisumu, westlands, cbd], nairobiView).map((p) => p.id)).toEqual(["w", "c"]);
  });

  it("does not filter when there is no viewport", () => {
    expect(filterToBounds([kisumu, cbd], null)).toHaveLength(2);
  });

  it("counts a point on the edge as inside", () => {
    expect(inBounds({ west: 36.803, south: -1.264, east: 37, north: 0 }, westlands)).toBe(true);
  });

  it("boxes a set of points and ignores an empty set", () => {
    expect(boundsOf([westlands, kisumu])).toEqual({ west: 34.768, south: -1.264, east: 36.803, north: -0.092 });
    expect(boundsOf([])).toBeNull();
  });

  it("treats near-identical viewports as the same", () => {
    expect(sameBounds(nairobiView, { ...nairobiView, west: 36.700001 })).toBe(true);
    expect(sameBounds(nairobiView, { ...nairobiView, west: 36.71 })).toBe(false);
    expect(sameBounds(null, null)).toBe(true);
  });
});
