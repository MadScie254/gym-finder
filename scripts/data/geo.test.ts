import { describe, expect, it } from "vitest";
import { COUNTIES as APP_COUNTIES } from "../../src/lib/kenya";
import { COUNTIES, assignCounty, countyFromText, inferCounties, isInKenya, placeCentre, reverseLookup, townFor } from "./geo.mjs";

describe("county assignment", () => {
  it("uses the same COUNTIES as the app (src/lib/kenya.ts)", () => {
    expect(COUNTIES).toEqual(APP_COUNTIES);
  });

  it("reads county names from free text", () => {
    expect(countyFromText("Nairobi City")?.name).toBe("Nairobi");
    expect(countyFromText("Uasin Gishu County")?.name).toBe("Uasin Gishu");
    expect(countyFromText("Murang'a")?.name).toBe("Murang'a");
    expect(countyFromText("Taita Taveta")?.name).toBe("Taita-Taveta");
    expect(countyFromText("Ruiru")).toBeNull();
    expect(countyFromText("110")).toBeNull();
  });

  it("trusts a source county only when it is plausibly near", () => {
    const rongai = { lat: -1.396, lng: 36.76 }; // Kajiado, but the Nairobi centroid is nearer
    expect(assignCounty(rongai, [])).toEqual({ name: "Nairobi", by: "centroid" });
    expect(assignCounty(rongai, ["Kajiado"])).toEqual({ name: "Kajiado", by: "hint" });
    expect(assignCounty({ lat: -0.3031, lng: 36.08 }, ["Nairobi"]).name).toBe("Nakuru"); // Nakuru town, wrong hint
    expect(assignCounty({ lat: -1.29, lng: 36.82 }, ["Turkana"]).name).toBe("Nairobi");
  });

  it("an un-hinted record takes the county of a hinted neighbour within 1.5 km", () => {
    const anchor = { id: "gers:a", lat: -1.2200, lng: 36.9000, county: "Nairobi", countyBy: "hint" };
    const osm = { id: "osm:node/1", lat: -1.2205, lng: 36.9003, county: "Kiambu", countyBy: "centroid" };
    const far = { id: "osm:node/2", lat: -1.2200, lng: 36.9300, county: "Kiambu", countyBy: "centroid" };
    const [a, b, c] = inferCounties([anchor, osm, far]);
    expect(a.county).toBe("Nairobi");
    expect(b).toMatchObject({ county: "Nairobi", countyBy: "neighbour" });
    expect(c.county).toBe("Kiambu");
  });
});

describe("places and polygon", () => {
  it("area is a suburb within 2 km; town is the nearest town within 30 km, else null", () => {
    expect(reverseLookup({ lat: -1.29797, lng: 36.78809 })).toMatchObject({ area: "Kilimani", town: "Nairobi" });
    expect(reverseLookup({ lat: 3.0, lng: 36.0 }).area).toBeNull();
  });

  it("finds place centres and checks the Kenya polygon", () => {
    expect(placeCentre("kilimani", "suburb")?.name).toBe("Kilimani");
    expect(placeCentre("Nowhere Estate")).toBeNull();
    expect(isInKenya({ lat: -1.2921, lng: 36.8219 })).toBe(true);
    expect(isInKenya({ lat: -6.8, lng: 39.2 })).toBe(false); // Dar es Salaam, inside the bounding box
    expect(isInKenya({ lat: 0.3, lng: 32.6 })).toBe(false); // Kampala
  });
});

describe("town for a venue", () => {
  it("is Nairobi for every venue in Nairobi City County, not the nearest GeoNames town", () => {
    expect(townFor({ lat: -1.3223, lng: 36.7037 }, "Nairobi")).toBe("Nairobi"); // Karen (nearest: Ngong)
    expect(townFor({ lat: -1.2212, lng: 36.9134 }, "Nairobi")).toBe("Nairobi"); // Kasarani (nearest: Ruiru)
    expect(townFor({ lat: -1.2823, lng: 36.9609 }, "Nairobi")).toBe("Nairobi"); // Utawala (nearest: Githunguri)
  });

  it("elsewhere is the nearest town, never a town named after another county", () => {
    expect(townFor({ lat: -1.3953, lng: 36.764 }, "Kajiado")).toBe("Ongata Rongai");
    expect(townFor({ lat: -1.2079, lng: 36.7869 }, "Kiambu")).toBe("Karuri"); // Ruaka
    expect(townFor({ lat: -1.25, lng: 36.80 }, "Kiambu")).not.toBe("Nairobi");
    expect(townFor({ lat: -0.3031, lng: 36.08 }, "Nakuru")).toBe("Nakuru");
    expect(townFor({ lat: 3.0, lng: 36.0 }, "Turkana")).toBeNull(); // nothing within 30 km
  });
});
