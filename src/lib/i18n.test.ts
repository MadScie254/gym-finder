import { describe, expect, it } from "vitest";
import { copy, t } from "./i18n";

describe("i18n completeness", () => {
  it("gives every English key a Swahili string", () => {
    expect(Object.keys(copy.sw).sort()).toEqual(Object.keys(copy.en).sort());
    for (const key of Object.keys(copy.en) as (keyof typeof copy.en)[]) {
      expect(copy.sw[key].length).toBeGreaterThan(0);
    }
  });

  it("keeps the visible link text inside the accessible name of the View gym link (WCAG 2.5.3)", () => {
    for (const lang of ["en", "sw"] as const) {
      expect(t(lang, "viewGymNamed", { name: "Example Gym" }).toLowerCase()).toContain(copy[lang].viewGym.toLowerCase());
    }
  });
});
