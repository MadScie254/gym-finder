import { describe, expect, it } from "vitest";

import { findCounty, matchCounties, tileIntersectsKenya } from "./kenya";

describe("findCounty", () => {
  it("does not treat short fragments as county names", () => {
    expect(findCounty("a")).toBeUndefined();
    expect(findCounty("ma")).toBeUndefined();
    expect(findCounty("ki")).toBeUndefined();
    expect(matchCounties("a")).toEqual([]);
    expect(matchCounties("ma")).toEqual([]);
    expect(matchCounties("ki")).toEqual([]);
  });

  it("matches a full county name and a unique prefix", () => {
    expect(findCounty("Nairobi")?.name).toBe("Nairobi");
    expect(findCounty("  mombasa ")?.name).toBe("Mombasa");
    expect(findCounty("nai")?.name).toBe("Nairobi");
    expect(findCounty("kil")?.name).toBe("Kilifi");
    expect(findCounty("man")?.name).toBe("Mandera");
    expect(findCounty("elgeyo")?.name).toBe("Elgeyo-Marakwet");
  });

  it("keeps ambiguous prefixes unresolved for a single county lookup", () => {
    expect(findCounty("kis")).toBeUndefined();
    expect(matchCounties("kis").map((county) => county.name)).toEqual(["Kisii", "Kisumu"]);
  });

  it("folds punctuation and keeps the longest county prefix of a longer query", () => {
    expect(findCounty("muranga")?.name).toBe("Murang'a");
    expect(findCounty("Murang'a")?.name).toBe("Murang'a");
    expect(findCounty("taita taveta")?.name).toBe("Taita-Taveta");
    expect(findCounty("Taita-Taveta")?.name).toBe("Taita-Taveta");
    expect(findCounty("nairobi west")?.name).toBe("Nairobi");
    expect(findCounty("west pokot town")?.name).toBe("West Pokot");
    expect(findCounty("bay")).toBeUndefined();
    expect(findCounty("")).toBeUndefined();
  });
});

describe("Kenya tile bounds", () => {
  it("allows a Nairobi tile and rejects world and non-Kenya tiles", () => {
    expect(tileIntersectsKenya(6, 38, 32)).toBe(true);
    expect(tileIntersectsKenya(5, 19, 16)).toBe(true);
    expect(tileIntersectsKenya(6, 31, 21)).toBe(false);
    expect(tileIntersectsKenya(10, 301, 385)).toBe(false);
    expect(tileIntersectsKenya(0, 0, 0)).toBe(false);
    expect(tileIntersectsKenya(20, 0, 0)).toBe(false);
    expect(tileIntersectsKenya(6, 999, 32)).toBe(false);
  });
});
