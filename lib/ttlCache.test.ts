import { describe, expect, it, vi } from "vitest";

import { withCircuitBreaker, withTtlCache } from "./ttlCache";

describe("provider resilience", () => {
  it("coalesces duplicate cache misses", async () => {
    const load = vi.fn(async () => "result");
    const key = `coalesce-${Date.now()}`;

    const results = await Promise.all([
      withTtlCache(key, 1_000, load),
      withTtlCache(key, 1_000, load),
      withTtlCache(key, 1_000, load),
    ]);

    expect(results).toEqual(["result", "result", "result"]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("opens a provider circuit after repeated failures", async () => {
    const provider = `provider-${Date.now()}`;
    const load = vi.fn(async () => {
      throw new Error("upstream down");
    });

    await expect(withCircuitBreaker(provider, load)).rejects.toThrow("upstream down");
    await expect(withCircuitBreaker(provider, load)).rejects.toThrow("upstream down");
    await expect(withCircuitBreaker(provider, load)).rejects.toThrow("upstream down");
    await expect(withCircuitBreaker(provider, load)).rejects.toThrow("temporarily unavailable");
    expect(load).toHaveBeenCalledTimes(3);
  });
});
