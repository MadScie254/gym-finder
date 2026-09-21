import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET as getStatic } from "../app/api/map/static/route";
import { GET as getTile } from "../app/api/map/tiles/[z]/[x]/[y]/route";
import { resetRateLimitsForTests } from "./requestSafety";

const NAIROBI_TILE = { z: "6", x: "38", y: "32" };
const LONDON_TILE = { z: "6", x: "31", y: "21" };

function tileRequest(path: string) {
  return new Request(`https://example.test${path}`, {
    headers: { "x-forwarded-for": "198.51.100.40" },
  });
}

describe("map tile route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    resetRateLimitsForTests();
  });

  it("rejects coordinates outside the selected zoom grid", async () => {
    const response = await getTile(
      tileRequest("/api/map/tiles/19/999999/999999"),
      { params: Promise.resolve({ z: "19", x: "999999", y: "999999" }) },
    );

    expect(response.status).toBe(400);
  });

  it("rejects unsupported zoom levels", async () => {
    const response = await getTile(tileRequest("/api/map/tiles/20/0/0"), {
      params: Promise.resolve({ z: "20", x: "0", y: "0" }),
    });

    expect(response.status).toBe(400);
  });

  it("rejects tiles outside Kenya without calling upstream", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await getTile(tileRequest("/api/map/tiles/6/31/21"), {
      params: Promise.resolve(LONDON_TILE),
    });

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("proxies an in-bounds tile only when the response is an allowed image", async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>(async () =>
      new Response("img", { headers: { "content-type": "image/png; charset=binary" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await getTile(tileRequest("/api/map/tiles/6/38/32"), {
      params: Promise.resolve(NAIROBI_TILE),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(String(fetchMock.mock.calls[0][0])).toContain("/6/32/38");
  });

  it("refuses a non-image upstream response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html></html>", { headers: { "content-type": "text/html" } })),
    );

    const response = await getTile(tileRequest("/api/map/tiles/6/38/32"), {
      params: Promise.resolve(NAIROBI_TILE),
    });

    expect(response.status).toBe(502);
  });

  it("does not fall back to the public ArcGIS basemap in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ESRI_TILE_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await getTile(tileRequest("/api/map/tiles/6/38/32"), {
      params: Promise.resolve(NAIROBI_TILE),
    });

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses a configured production tile prefix", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ESRI_TILE_URL", "https://tiles.example/base/");
    const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>(async () =>
      new Response("img", { headers: { "content-type": "image/jpeg" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await getTile(tileRequest("/api/map/tiles/6/38/32"), {
      params: Promise.resolve(NAIROBI_TILE),
    });

    expect(response.status).toBe(200);
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://tiles.example/base/6/32/38");
  });
});

describe("static map route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    resetRateLimitsForTests();
  });

  it("rejects a center outside Kenya", async () => {
    const response = await getStatic(
      new NextRequest("https://example.test/api/map/static?lat=51.5&lng=-0.12", {
        headers: { "x-forwarded-for": "198.51.100.41" },
      }),
    );
    expect(response.status).toBe(400);
  });

  it("does not fall back to the public ArcGIS export in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ESRI_EXPORT_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await getStatic(
      new NextRequest("https://example.test/api/map/static?lat=-1.28&lng=36.82", {
        headers: { "x-forwarded-for": "198.51.100.42" },
      }),
    );

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
