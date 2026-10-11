import { describe, expect, it, vi } from "vitest";

import { catalogNearbyGyms } from "./kenyaGymCatalog";
import { getPlaceDetails } from "./osmPlaces";

describe("Overpass access", () => {
  it("serves a catalog gym without calling Overpass", async () => {
    const listed = catalogNearbyGyms({ lat: -1.286389, lng: 36.817223 }, 5_000, 1)[0];
    expect(listed?.listingComplete).toBe(true);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const details = await getPlaceDetails(listed.id);

    expect(details?.id).toBe(listed.id);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("spaces a second Overpass lookup the way Nominatim is spaced", async () => {
    const fetchMock = vi.fn(async () => Response.json({ elements: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await getPlaceDetails("node/9000000000001");
    await getPlaceDetails("node/9000000000002");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
