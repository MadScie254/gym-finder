import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { rateLimit, readBoundedQuery, readRadius, resetRateLimitsForTests } from "./requestSafety";

function forwarded(scope: string, forwardedFor: string) {
  return {
    scope,
    request: new Request("https://example.test/api/places/search", {
      headers: { "x-forwarded-for": forwardedFor },
    }),
  };
}

describe("request boundary validation", () => {
  beforeEach(() => {
    resetRateLimitsForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    resetRateLimitsForTests();
  });

  it("enforces the supported nearby-search radius", () => {
    expect(readRadius(null)).toBe(5_000);
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
    const scope = "retry";

    expect(rateLimit(request, scope, 1, 60_000)).toBeNull();
    const limited = rateLimit(request, scope, 1, 60_000);
    expect(limited?.status).toBe(429);
    expect(limited?.headers.get("Retry-After")).toBeTruthy();
  });

  it("keys on the right-most forwarded address and ignores a spoofed left-most hop", () => {
    const scope = "xff";
    const spoofed = forwarded(scope, "203.0.113.9, 198.51.100.27");
    const direct = forwarded(scope, "198.51.100.27");

    expect(rateLimit(spoofed.request, scope, 1, 60_000)).toBeNull();
    expect(rateLimit(direct.request, scope, 1, 60_000)?.status).toBe(429);
  });

  it("does not give a rotated left-most address a fresh bucket", () => {
    const scope = "xff-rotate";
    expect(rateLimit(forwarded(scope, "198.51.100.27").request, scope, 1, 60_000)).toBeNull();
    expect(
      rateLimit(forwarded(scope, "203.0.113.50, 198.51.100.027").request, scope, 1, 60_000)?.status,
    ).toBe(429);
  });

  it("keeps separate buckets for different right-most addresses", () => {
    const scope = "xff-distinct";
    expect(rateLimit(forwarded(scope, "203.0.113.9, 198.51.100.27").request, scope, 1, 60_000)).toBeNull();
    expect(rateLimit(forwarded(scope, "203.0.113.9, 198.51.100.28").request, scope, 1, 60_000)).toBeNull();
  });

  it("uses a platform header when X-Forwarded-For is absent and ignores a spoofed one when it is present", () => {
    const scope = "platform";
    const platformOnly = new Request("https://example.test/", {
      headers: { "cf-connecting-ip": "203.0.113.10" },
    });
    const spoofedPlatform = new Request("https://example.test/", {
      headers: {
        "cf-connecting-ip": "203.0.113.10",
        "x-forwarded-for": "198.51.100.27",
      },
    });

    expect(rateLimit(platformOnly, scope, 1, 60_000)).toBeNull();
    expect(rateLimit(spoofedPlatform, scope, 1, 60_000)).toBeNull();
    expect(rateLimit(platformOnly, scope, 1, 60_000)?.status).toBe(429);
  });

  it("uses only the configured trusted header", () => {
    vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "cf-connecting-ip");
    const scope = "configured";
    const request = new Request("https://example.test/", {
      headers: {
        "cf-connecting-ip": "203.0.113.10",
        "x-forwarded-for": "198.51.100.27",
      },
    });
    const otherHeader = new Request("https://example.test/", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });

    expect(rateLimit(request, scope, 1, 60_000)).toBeNull();
    expect(rateLimit(otherHeader, scope, 1, 60_000)).toBeNull();
    expect(rateLimit(request, scope, 1, 60_000)?.status).toBe(429);
  });

  it("rejects unidentified production traffic instead of sharing an anonymous bucket", () => {
    vi.stubEnv("NODE_ENV", "production");
    const scope = "anonymous";
    const first = new Request("https://example.test/a");
    const second = new Request("https://example.test/b");

    expect(rateLimit(first, scope, 100, 60_000)?.status).toBe(429);
    expect(rateLimit(second, scope, 100, 60_000)?.status).toBe(429);
  });

  it("rate limits headerless local development traffic in one process bucket", () => {
    const scope = "local";
    const first = new Request("https://example.test/a");
    const second = new Request("https://example.test/b");

    expect(rateLimit(first, scope, 1, 60_000)).toBeNull();
    expect(rateLimit(second, scope, 1, 60_000)?.status).toBe(429);
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

  it("drops expired buckets before evicting clients that are still inside their window", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const scope = "expired";
    const stale = new Request("https://example.test/", {
      headers: { "x-forwarded-for": "192.0.2.9" },
    });
    expect(rateLimit(stale, scope, 1, 1_000)).toBeNull();
    expect(rateLimit(stale, scope, 1, 1_000)?.status).toBe(429);

    vi.setSystemTime(new Date("2026-01-01T00:00:02Z"));
    for (let i = 0; i < 1_000; i += 1) {
      rateLimit(
        new Request("https://example.test/", {
          headers: { "x-forwarded-for": `198.51.${Math.floor(i / 256)}.${i % 256}` },
        }),
        scope,
        1,
        60_000,
      );
    }

    const newest = new Request("https://example.test/", {
      headers: { "x-forwarded-for": `198.51.${Math.floor(999 / 256)}.${999 % 256}` },
    });
    expect(rateLimit(newest, scope, 1, 60_000)?.status).toBe(429);
    expect(rateLimit(stale, scope, 1, 60_000)).toBeNull();
  });
});
