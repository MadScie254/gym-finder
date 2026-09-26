import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getStaticMap } from "../app/api/map/static/route";

describe("static map fallback", () => {
  it("rejects an out-of-country center before contacting a provider", async () => {
    const response = await getStaticMap(new NextRequest("https://example.test/api/map/static?lat=-1.764&lng=33.965"));
    expect(response.status).toBe(400);
  });

  it("rejects non-finite coordinates", async () => {
    const response = await getStaticMap(new NextRequest("https://example.test/api/map/static?lat=Infinity&lng=36.817"));
    expect(response.status).toBe(400);
  });
});
