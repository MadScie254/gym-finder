import { afterEach, describe, expect, it, vi } from "vitest";

import { rateLimit, readBoundedQuery, readRadius, resetRateLimitsForTests } from "./requestSafety";

describe("request boundary validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetRateLimitsForTests();
  });

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

  it("keys on the right-most forwarded address and ignores a spoofed left-most hop", () => {
    const scope = "xff";
    const spoofed = new Request("https://example.test/", {
      headers: { "x-forwarded-for": "203.0.113.9, 198.51.100.27" },
    });
    const direct = new Request("https://example.test/", {
      headers: { "x-forwarded-for": "198.51.100.27" },
    });

    expect(rateLimit(spoofed, scope, 1, 60_000)).toBeNull();
    expect(rateLimit(direct, scope, 1, 60_000)?.status).toBe(429);
  });

  it("rejects unidentified production traffic instead of sharing an anonymous bucket", () => {
    vi.stubEnv("NODE_ENV", "production");
    const scope = "anonymous";
    expect(rateLimit(new Request("https://example.test/a"), scope, 100, 60_000)?.status).toBe(429);
    expect(rateLimit(new Request("https://example.test/b"), scope, 100, 60_000)?.status).toBe(429);
  });

  it("does not reset every live bucket when the tracker is full", () => {
    const scope = "pressure";
    const clients: Request[] = [];
    for (let i = 0; i < 1_000; i += 1) {
      const request = new Request("https://example.test/", {
        headers: { "x-forwarded-for": `203.0.${Math.floor(i / 256)}.${i % 256}` },
      });
      expect(rateLimit(request, scope, 1, 60_000)).toBeNull();
      clients.push(request);
    }

    const extra = new Request("https://example.test/", {
      headers: { "x-forwarded-for": "192.0.2.50" },
    });
    expect(rateLimit(extra, scope, 1, 60_000)).toBeNull();
    expect(rateLimit(clients[clients.length - 1], scope, 1, 60_000)?.status).toBe(429);
    expect(rateLimit(clients[0], scope, 1, 60_000)).toBeNull();
  });
});
