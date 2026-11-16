import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");
const shell = read("./Shell.module.css");

/** The text of the first block that starts with this opener, braces balanced. */
function block(css: string, opener: string): string {
  const start = css.indexOf(opener);
  expect(start, `${opener} is missing`).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}" && --depth === 0) return css.slice(start, i + 1);
  }
  throw new Error(`${opener} is not closed`);
}

describe("shell css contract", () => {
  it("sizes the sidebar column from one custom property, 272 px full and 72 px as a rail", () => {
    expect(shell).toMatch(/\[data-mode="sidebar"\]\s*\{[^}]*--sidebar-width:\s*272px/);
    expect(shell).toMatch(/\[data-mode="sidebar"\]\[data-collapsed\]\s*\{[^}]*--sidebar-width:\s*72px/);
    expect(shell).toMatch(/grid-template-columns:\s*var\(--sidebar-width\)\s+minmax\(0,\s*1fr\)/);
  });

  it("scrolls the page in its own area only in sidebar mode, and leaves Discovery to scroll itself", () => {
    expect(shell).toMatch(/\[data-mode="sidebar"\]\s*\.main\s*\{[^}]*overflow-y:\s*auto/);
    expect(shell).toMatch(/\[data-mode="sidebar"\]\[data-discovery\]\s*\.main\s*\{[^}]*overflow:\s*hidden/);
    expect(shell.replace(/\[data-mode="sidebar"\][^{]*\{[^}]*\}/g, "")).not.toMatch(/\.main\s*\{[^}]*overflow-y:\s*auto/);
  });

  it("lets a printed page run to as many sheets as it needs, and prints no sidebar or top bar", () => {
    const print = block(shell, "@media print");
    expect(print).toMatch(/height:\s*auto/);
    expect(print).toMatch(/overflow:\s*visible/);
    expect(block(read("./Sidebar.module.css"), "@media print")).toMatch(/\.side\s*\{\s*display:\s*none/);
    expect(block(read("./TopBar.module.css"), "@media print")).toMatch(/\.bar\s*\{\s*display:\s*none/);
  });
});
