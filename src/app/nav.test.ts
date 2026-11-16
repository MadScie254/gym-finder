import { describe, expect, it } from "vitest";
import { NAV_GROUPS, currentEntry, pageTitleKey } from "./nav";

const all = NAV_GROUPS.flatMap((group) => group.items);

describe("nav model", () => {
  it("lists the groups and entries in the approved order", () => {
    expect(NAV_GROUPS.map((group) => [group.id, group.items.map((item) => item.id)])).toEqual([
      ["explore", ["home", "find", "saved"]],
      ["plan", ["week", "meals", "shopping", "order"]],
      ["help", ["reports", "about", "legal"]],
    ]);
  });

  it("marks the longest matching entry as current", () => {
    const id = (pathname: string) => currentEntry(pathname)?.id ?? null;
    expect([
      id("/"), id("/plan"), id("/plan/setup"), id("/plan/meals"), id("/plan/shopping"), id("/fuel/basket"),
      id("/gym/level-24-114c"), id("/county/nairobi"), id("/compare"), id("/about/data"), id("/legal"), id("/zzz"),
    ]).toEqual(["home", "week", "week", "meals", "shopping", "order", "find", "find", "find", "about", "legal", null]);
  });

  it("titles a page by its entry and falls back to the brand", () => {
    expect(pageTitleKey("/plan/meals")).toBe("navMeals");
    expect(pageTitleKey("/zzz")).toBe("brand");
  });

  it("tags only Order food as a demo and only Saved with a count", () => {
    expect(all.filter((item) => item.tag === "demo").map((item) => item.id)).toEqual(["order"]);
    expect(all.filter((item) => item.count === "saved").map((item) => item.id)).toEqual(["saved"]);
  });
});
