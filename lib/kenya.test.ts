import { describe, expect, it } from "vitest";

import { findCounty, matchCounties } from "./kenya";
import { suggestKenyaPlaces } from "./kenyaPlaces";

describe("findCounty", () => {
  it("does not treat short fragments as county names", () => {
    expect(findCounty("a")).toBeUndefined();
    expect(findCounty("ma")).toBeUndefined();
    expect(findCounty("ki")).toBeUndefined();
    expect(matchCounties("a")).toEqual([]);
    expect(matchCounties("ma")).toEqual([]);
    expect(matchCounties("ki")).toEqual([]);
    expect(suggestKenyaPlaces("a").some((place) => place.kind === "county")).toBe(false);
    expect(suggestKenyaPlaces("ki").some((place) => place.kind === "county" && place.name === "Kilifi")).toBe(false);
    expect(suggestKenyaPlaces("ma").some((place) => place.kind === "county" && place.name === "Mandera")).toBe(false);
  });

  it("matches a full county name, a unique prefix, and the longest leading county", () => {
    expect(findCounty("Nairobi")?.name).toBe("Nairobi");
    expect(findCounty("nai")?.name).toBe("Nairobi");
    expect(findCounty("kil")?.name).toBe("Kilifi");
    expect(findCounty("man")?.name).toBe("Mandera");
    expect(findCounty("muranga")?.name).toBe("Murang'a");
    expect(findCounty("nairobi west")?.name).toBe("Nairobi");
    expect(suggestKenyaPlaces("nai").some((place) => place.name === "Nairobi" && place.kind === "county")).toBe(true);
  });

  it("keeps ambiguous prefixes unresolved for a single county lookup", () => {
    expect(findCounty("kis")).toBeUndefined();
    expect(matchCounties("kis").map((county) => county.name)).toEqual(["Kisii", "Kisumu"]);
  });
});
