import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as getStaticMap } from "../app/api/map/static/route";
import { resetRateLimitsForTests } from "./requestSafety";

function mapRequest(url: string) {
  return new NextRequest(url, { headers: { "x-forwarded-for": "198.51.100.40" } });
}

describe("static map fallback", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    resetRateLimitsForTests();
  });

  it("rejects an out-of-country center before contacting a provider", async () => {
    const response = await getStaticMap(mapRequest("https://example.test/api/map/static?lat=-1.764&lng=33.965"));
    expect(response.status).toBe(400);
  });

  it("rejects non-finite coordinates", async () => {
    const response = await getStaticMap(mapRequest("https://example.test/api/map/static?lat=Infinity&lng=36.817"));
    expect(response.status).toBe(400);
  });

  it("does not fall back to the public ArcGIS export in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ESRI_EXPORT_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await getStaticMap(mapRequest("https://example.test/api/map/static?lat=-1.286389&lng=36.817223"));

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a non-image upstream response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html></html>", { headers: { "content-type": "text/html" } })),
    );

    const response = await getStaticMap(mapRequest("https://example.test/api/map/static?lat=-1.286389&lng=36.817223"));
    expect(response.status).toBe(502);
  });
});
