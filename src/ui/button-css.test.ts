import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./Button.module.css", import.meta.url), "utf8");

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

describe("Send button motion contract", () => {
  it("swaps the label and loops the plane only where hover exists", () => {
    const hover = block("@media (hover: hover)");
    expect(hover).toContain(":hover .win");
    expect(hover).toMatch(/animation:\s*fly[^;]*infinite/);
    // Nothing outside the hover block starts the loop.
    expect(css.replace(hover, "")).not.toMatch(/infinite/);
  });

  it("plays the plane once on press where there is no hover", () => {
    const touch = block("@media (hover: none)");
    expect(touch).toContain(":active");
    expect(touch).toMatch(/animation-iteration-count:\s*1/);
  });

  it("drops the loop and the transitions for reduced motion", () => {
    const reduced = block("@media (prefers-reduced-motion: reduce)");
    expect(reduced).toMatch(/animation:\s*none/);
    expect(reduced).toMatch(/transition:\s*none/);
  });
});
