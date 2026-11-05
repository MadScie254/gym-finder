import { describe, expect, it } from "vitest";
import { copy } from "./i18n";

describe("i18n completeness", () => {
  it("gives every English key a Swahili string", () => {
    expect(Object.keys(copy.sw).sort()).toEqual(Object.keys(copy.en).sort());
    for (const key of Object.keys(copy.en) as (keyof typeof copy.en)[]) {
      expect(copy.sw[key].length).toBeGreaterThan(0);
    }
  });
});
