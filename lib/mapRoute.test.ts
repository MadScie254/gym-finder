import { describe, expect, it } from "vitest";

import { GET as getTile } from "../app/api/map/tiles/[z]/[x]/[y]/route";

describe("map tile route", () => {
  it("rejects coordinates outside the selected zoom grid", async () => {
    const response = await getTile(
      new Request("https://example.test/api/map/tiles/19/999999/999999"),
      { params: Promise.resolve({ z: "19", x: "999999", y: "999999" }) },
    );

    expect(response.status).toBe(400);
  });

  it("rejects unsupported zoom levels", async () => {
    const response = await getTile(
      new Request("https://example.test/api/map/tiles/20/0/0"),
      { params: Promise.resolve({ z: "20", x: "0", y: "0" }) },
    );

    expect(response.status).toBe(400);
  });
});
