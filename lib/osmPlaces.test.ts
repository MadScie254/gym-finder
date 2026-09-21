import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPlaceDetails, searchNearbyGyms } from "./osmPlaces";

const element = {
  type: "node",
  id: 42,
  lat: -1.2864,
  lon: 36.8172,
  tags: {
    name: "Test Gym",
    leisure: "fitness_centre",
    phone: "+254700000000",
    opening_hours: "24/7",
  },
};

describe("Overpass access", () => {
  let now = Date.parse("2026-06-01T00:00:00Z");

  beforeEach(() => {
    now += 60_000;
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    vi.stubEnv("OVERPASS_ENDPOINTS", "https://overpass.test/api/interpreter");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ elements: [element] })),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("marks nearby gyms complete and serves details from that payload", async () => {
    const gyms = await searchNearbyGyms({ lat: -1.2864, lng: 36.8172 }, 1_000);
    expect(gyms[0]).toMatchObject({
      id: "node/42",
      name: "Test Gym",
      phone: "+254700000000",
      listingComplete: true,
    });

    vi.mocked(fetch).mockClear();
    const details = await getPlaceDetails("node/42");
    expect(details?.name).toBe("Test Gym");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("spaces a second Overpass lookup the way Nominatim is spaced", async () => {
    await searchNearbyGyms({ lat: -1.2864, lng: 36.8172 }, 2_000);
    await expect(searchNearbyGyms({ lat: -1.29, lng: 36.83 }, 2_000)).rejects.toThrow(/busy/i);
    expect(fetch).toHaveBeenCalledTimes(1);

    now += 2_000;
    vi.setSystemTime(now);
    const later = await searchNearbyGyms({ lat: -1.3, lng: 36.84 }, 2_000);
    expect(later[0]?.id).toBe("node/42");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
