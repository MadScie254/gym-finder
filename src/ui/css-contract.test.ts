import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./base.css", import.meta.url), "utf8");
const GATE = "@media (min-width: 1100px) and (hover: hover) and (pointer: fine)";

describe("base.css glass and texture contract", () => {
  it("draws the texture from the committed mask files", () => {
    for (const name of ["contours-minor.svg", "contours-major.svg"]) {
      expect(css).toContain(`./texture/${name}`);
      expect(existsSync(new URL(`./texture/${name}`, import.meta.url))).toBe(true);
    }
  });

  it("keeps every backdrop-filter inside the wide, fine-pointer gate", () => {
    const gate = css.indexOf(GATE);
    expect(gate).toBeGreaterThan(-1);
    const uses = [...css.matchAll(/backdrop-filter/g)].map((match) => match.index ?? -1);
    expect(uses.length).toBeGreaterThan(0);
    for (const at of uses) expect(at).toBeGreaterThan(gate);
  });

  it("turns glass off for reduced transparency and through a switch on the root", () => {
    const gate = css.indexOf(GATE);
    expect(css.indexOf("@media (prefers-reduced-transparency: reduce)")).toBeGreaterThan(gate);
    expect(css).toContain(':root[data-glass="off"] .glass');
  });

  it("gives .glass a solid surface outside the gate", () => {
    const outside = css.slice(0, css.indexOf(GATE));
    expect(outside).toMatch(/\.glass\s*\{[^}]*background:\s*var\(--color-surface\)/);
  });

  it("hides the texture in print", () => {
    expect(css).toMatch(/@media print\s*\{[^}]*body::before/);
  });
});
