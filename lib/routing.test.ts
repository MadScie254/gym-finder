import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/map/route/route";
import { parseOsrmRoute } from "./routing";

const routePayload = {
  code: "Ok",
  routes: [{
    distance: 4200,
    duration: 540,
    geometry: { coordinates: [[36.817, -1.286], [36.826, -1.298]] },
    legs: [{ steps: [
      { distance: 800, name: "Kenyatta Avenue", maneuver: { type: "depart" } },
      { distance: 3400, name: "", maneuver: { type: "arrive" } },
    ] }],
  }],
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.OSRM_DRIVING_URL;
});

describe("OSRM route parsing", () => {
  it("converts valid route geometry and steps", () => {
    expect(parseOsrmRoute(routePayload)).toMatchObject({
      distanceMeters: 4200,
      durationSeconds: 540,
      coordinates: [[36.817, -1.286], [36.826, -1.298]],
      steps: [{ instruction: "Start on Kenyatta Avenue" }, { instruction: "Arrive at the gym" }],
    });
  });

  it("rejects malformed geometry and non-finite metrics", () => {
    expect(parseOsrmRoute({ ...routePayload, routes: [{ ...routePayload.routes[0], distance: Infinity }] })).toBeNull();
    expect(parseOsrmRoute({ ...routePayload, routes: [{ ...routePayload.routes[0], geometry: { coordinates: [[NaN, 0], [36, -1]] } }] })).toBeNull();
  });
});

describe("in-app route API", () => {
  const request = (origin: unknown, destination: unknown) => new Request("https://example.test/api/map/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin, destination }),
  });
  const start = { lat: -1.286, lng: 36.817 };
  const end = { lat: -1.298, lng: 36.826 };

  it("rejects invalid or out-of-Kenya points before calling a provider", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await POST(request({ lat: -1.286, lng: "36.817" }, end))).status).toBe(400);
    expect((await POST(request({ lat: 0.34, lng: 32.58 }, end))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a validated route with no-store caching", async () => {
    process.env.OSRM_DRIVING_URL = "https://routing.example.test/route/v1/driving";
    const fetchMock = vi.fn().mockResolvedValue(Response.json(routePayload));
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(request(start, end));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect((await response.json()).route.distanceMeters).toBe(4200);
    expect(String(fetchMock.mock.calls[0][0])).toContain("36.817,-1.286;36.826,-1.298");
  });

  it("does not use a public demo in production-style builds", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(request(start, end));
    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
