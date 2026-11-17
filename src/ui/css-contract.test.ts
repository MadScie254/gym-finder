import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./base.css", import.meta.url), "utf8");
const GATE = "@media (min-width: 1100px) and (hover: hover) and (pointer: fine)";

/** The text of the first block that starts with `head`, braces balanced. */
function block(head: string): string {
  const start = css.indexOf(head);
  expect(start, `missing ${head}`).toBeGreaterThan(-1);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") depth -= 1;
    if (depth === 0) return css.slice(start, i + 1);
  }
  throw new Error(`unbalanced block ${head}`);
}

describe("base.css glass contract", () => {
  it("draws nothing behind the page: the background is the plain token colour", () => {
    expect(css).not.toMatch(/body::(before|after)/);
    expect(css).not.toContain("mask-image");
    expect(existsSync(new URL("./texture", import.meta.url))).toBe(false);
  });

  it("keeps every backdrop-filter inside the wide, fine-pointer gate, and outside it only turns blur off", () => {
    const gate = block(GATE);
    expect([...gate.matchAll(/backdrop-filter:/g)].length).toBeGreaterThan(0);
    const outside = css.replace(gate, "");
    const values = [...outside.matchAll(/backdrop-filter:\s*([^;]+);/g)].map((match) => match[1].trim());
    // The overrides for reduced transparency and the kill switch are the only ones outside the gate.
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) expect(value).toBe("none");
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
});
