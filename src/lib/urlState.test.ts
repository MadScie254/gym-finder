import { describe, expect, it } from "vitest";
import { activeFilterCount, NO_FILTERS, parseFilters, queryString, writeFilters } from "./urlState";

describe("filter state in the URL", () => {
  it("round-trips every filter", () => {
    const filters = { q: "salute", kind: "boxing" as const, km: 5 as const, trust: "strong" as const, phone: true, open: true, sort: "trust" as const };
    const params = writeFilters(filters);
    expect(params.toString()).toBe("q=salute&kind=boxing&km=5&trust=strong&phone=1&open=1&sort=trust");
    expect(parseFilters(params)).toEqual(filters);
  });

  it("leaves defaults out so a plain list has a plain URL", () => {
    expect(queryString(writeFilters(NO_FILTERS))).toBe("");
  });

  it("ignores values it does not know, instead of failing", () => {
    expect(parseFilters(new URLSearchParams("kind=spa&km=7&trust=gold&sort=price&phone=yes"))).toEqual(NO_FILTERS);
  });

  it("keeps unrelated keys such as the compare ids", () => {
    const next = writeFilters({ ...NO_FILTERS, open: true }, new URLSearchParams("ids=a,b&open=1&kind=yoga"));
    expect(next.get("ids")).toBe("a,b");
    expect(next.get("kind")).toBeNull();
    expect(next.get("open")).toBe("1");
  });

  it("counts narrowing filters only", () => {
    expect(activeFilterCount({ ...NO_FILTERS, q: "x", sort: "trust" })).toBe(0);
    expect(activeFilterCount({ ...NO_FILTERS, kind: "yoga", phone: true, trust: "verified" })).toBe(3);
  });
});
