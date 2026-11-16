import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { generateContours } from "./contours.mjs";

const committed = (name) => readFileSync(new URL(`../src/ui/texture/${name}`, import.meta.url), "utf8");

it("is deterministic", () => {
  expect(generateContours()).toEqual(generateContours());
});

it("stays within the size budget for both masks together", () => {
  const { minor, major } = generateContours();
  expect(minor.length + major.length).toBeLessThanOrEqual(60_000);
});

it("writes opaque black strokes on the 1920 by 1200 canvas, so they work as CSS masks", () => {
  const { minor, major } = generateContours();
  for (const svg of [minor, major]) {
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('viewBox="0 0 1920 1200"');
    expect(svg).toContain('<path d="M');
    expect(svg).toContain('stroke="#000"');
  }
});

it("matches the committed files, so the generator and the app cannot drift apart", () => {
  const { minor, major } = generateContours();
  expect(committed("contours-minor.svg")).toBe(minor);
  expect(committed("contours-major.svg")).toBe(major);
});
