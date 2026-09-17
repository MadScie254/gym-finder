import { describe, expect, it } from "vitest";

import { rateLimit, readBoundedQuery, readRadius } from "./requestSafety";

describe("request boundary validation", () => {
  it("enforces the supported nearby-search radius", () => {
    expect(readRadius(null)).toBe(0);
    expect(readRadius("0")).toBe(0);
    expect(readRadius("400")).toBe(400);
    expect(readRadius("40000")).toBe(40_000);
    expect(readRadius("399")).toBeNull();
    expect(readRadius("40001")).toBeNull();
    expect(readRadius("not-a-number")).toBeNull();
  });

  it("rejects blank and oversized text searches", () => {
    expect(readBoundedQuery("   ")).toEqual({ error: "q is required" });
    expect(readBoundedQuery("x".repeat(121))).toEqual({
      error: "q must be 120 characters or fewer",
    });
    expect(readBoundedQuery(" Nairobi ")).toEqual({ query: "Nairobi" });
  });

  it("returns a retryable response after a client exceeds a route limit", () => {
    const request = new Request("https://example.test/api/places/search", {
      headers: { "x-forwarded-for": "198.51.100.27" },
    });
    const scope = `test-${Date.now()}`;

    expect(rateLimit(request, scope, 1, 60_000)).toBeNull();
    const limited = rateLimit(request, scope, 1, 60_000);
    expect(limited?.status).toBe(429);
    expect(limited?.headers.get("Retry-After")).toBeTruthy();
  });
});
