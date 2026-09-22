import { describe, expect, it } from "vitest";
import { clampPadding, shouldFallbackOnError, type MapPadding } from "./mapView";

const DESKTOP: MapPadding = { top: 88, right: 28, bottom: 28, left: 440 };

describe("shouldFallbackOnError", () => {
  it("does not fall back before the error threshold", () => {
    expect(
      shouldFallbackOnError({ hasRendered: false, usedFallback: false, errorCount: 3 }),
    ).toBe(false);
  });

  it("falls back when tiles never render and errors reach the threshold", () => {
    expect(
      shouldFallbackOnError({ hasRendered: false, usedFallback: false, errorCount: 4 }),
    ).toBe(true);
  });

  it("never hides a map that has already rendered, no matter how many errors", () => {
    expect(
      shouldFallbackOnError({ hasRendered: true, usedFallback: false, errorCount: 999 }),
    ).toBe(false);
  });

  it("only fires once per map instance", () => {
    expect(
      shouldFallbackOnError({ hasRendered: false, usedFallback: true, errorCount: 50 }),
    ).toBe(false);
  });

  it("honours a custom threshold", () => {
    expect(
      shouldFallbackOnError({ hasRendered: false, usedFallback: false, errorCount: 2 }, 2),
    ).toBe(true);
  });
});

describe("clampPadding", () => {
  it("leaves padding untouched when it fits the viewport", () => {
    expect(clampPadding(DESKTOP, 1440, 900)).toEqual(DESKTOP);
  });

  it("shrinks horizontal padding that would exceed the drawable width", () => {
    const clamped = clampPadding(DESKTOP, 600, 900);
    expect(clamped.left + clamped.right).toBeLessThanOrEqual(600 - 40);
    // Ratio between left and right is preserved.
    expect(clamped.left).toBeGreaterThan(clamped.right);
    expect(clamped.top).toBe(DESKTOP.top);
  });

  it("shrinks vertical padding that would exceed the drawable height", () => {
    const clamped = clampPadding({ top: 220, right: 16, bottom: 220, left: 16 }, 800, 300);
    expect(clamped.top + clamped.bottom).toBeLessThanOrEqual(300 - 40);
  });

  it("never produces negative padding on tiny containers", () => {
    const clamped = clampPadding(DESKTOP, 20, 20);
    expect(clamped.left).toBeGreaterThanOrEqual(0);
    expect(clamped.right).toBeGreaterThanOrEqual(0);
    expect(clamped.top).toBeGreaterThanOrEqual(0);
    expect(clamped.bottom).toBeGreaterThanOrEqual(0);
  });

  it("does not clamp when dimensions are unknown (zero)", () => {
    expect(clampPadding(DESKTOP, 0, 0)).toEqual(DESKTOP);
  });
});
