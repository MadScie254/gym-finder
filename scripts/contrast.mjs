// WCAG 2.2 contrast check for the Signwriter tokens in src/ui/tokens.css.
// Fails (exit 1) when a pair is under its minimum:
//   text 4.5:1, large text (24 px, or 18.7 px bold) 3:1, UI boundaries and icons 3:1.
// Also fails when the system dark block and the forced dark block disagree.
// Usage: node scripts/contrast.mjs [--markdown]
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(path.join(ROOT, "src/ui/tokens.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

function block(selectorPattern) {
  const match = css.match(selectorPattern);
  if (!match) throw new Error(`Block not found: ${selectorPattern}`);
  const start = css.indexOf("{", match.index + match[0].length - 1) + 1;
  let depth = 1;
  let end = start;
  while (depth > 0 && end < css.length) {
    if (css[end] === "{") depth += 1;
    if (css[end] === "}") depth -= 1;
    end += 1;
  }
  const vars = {};
  for (const [, name, value] of css.slice(start, end - 1).matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) vars[name] = value.trim();
  return vars;
}

const base = block(/^:root\s*\{/m);
const systemDark = block(/:root:not\(\[data-theme="light"\]\)\s*\{/);
const forcedDark = block(/:root\[data-theme="dark"\],\s*\[data-theme="dark"\]\s*\{/);

function parse(value) {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)).concat(1);
  const rgba = value.match(/^rgba?\(([^)]+)\)$/);
  if (rgba) {
    const [r, g, b, a = "1"] = rgba[1].split(",").map((part) => part.trim());
    return [Number(r), Number(g), Number(b), Number(a)];
  }
  throw new Error(`Unsupported colour: ${value}`);
}

function resolve(vars, name, seen = new Set()) {
  const raw = vars[name] ?? base[name];
  if (raw == null) throw new Error(`Unknown token --${name}`);
  const ref = raw.match(/^var\(--([\w-]+)\)$/);
  if (!ref) return parse(raw);
  if (seen.has(ref[1])) throw new Error(`Cycle at --${name}`);
  seen.add(ref[1]);
  return resolve(vars, ref[1], seen);
}

function over(top, bottom) {
  const a = top[3];
  return [0, 1, 2].map((i) => Math.round(top[i] * a + bottom[i] * (1 - a))).concat(1);
}

function luminance([r, g, b]) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const MIN = { text: 4.5, large: 3, ui: 3 };

// Every foreground/background pair a component in src/ui actually draws.
const PAIRS = [
  ["text", "text", "bg", "Body text on page"],
  ["text", "text", "surface", "Body text on cards and sheets"],
  ["text", "text", "sunk", "Text on sunk wells (badges, skeleton)"],
  ["text", "text-muted", "bg", "Secondary text on page"],
  ["text", "text-muted", "surface", "Secondary text on cards"],
  ["text", "text-muted", "sunk", "Secondary text on sunk wells"],
  ["text", "link", "bg", "Links on page"],
  ["text", "link", "surface", "Links and quiet buttons on cards"],
  ["text", "on-action", "action", "Primary button label"],
  ["text", "on-action", "action-hover", "Primary button label, hover"],
  ["text", "on-highlight", "highlight", "Open distance block, active chip"],
  ["text", "on-plate", "plate", "Distance numerals on plate"],
  ["text", "plate-muted", "plate", "Unit and caption on plate"],
  ["text", "on-inverse", "inverse", "Offline banner"],
  ["text", "ok", "surface", "Open and verified wording on cards"],
  ["text", "ok", "bg", "Open and verified wording on page"],
  ["text", "danger", "surface", "Closed and error wording on cards"],
  ["text", "danger", "bg", "Error wording on page"],
  ["ui", "line-strong", "bg", "Control boundary on page (chips, inputs)"],
  ["ui", "line-strong", "surface", "Control boundary on cards"],
  ["ui", "focus", "bg", "Focus ring on page"],
  ["ui", "focus", "surface", "Focus ring on cards"],
  ["ui", "action", "surface", "Primary button edge on cards"],
  ["ui", "action", "bg", "Primary button edge on page"],
  ["ui", "plate-edge", "surface", "Distance block edge on cards"],
  ["ui", "plate-edge", "bg", "Distance block edge on page"],
  ["ui", "on-highlight", "highlight", "Active chip border on signal"],
  ["ui", "tier-verified", "surface", "Verified roundel"],
  ["ui", "tier-corroborated", "surface", "Corroborated rings"],
  ["ui", "tier-listed", "surface", "Listed ring"],
  ["ui", "tier-unconfirmed", "surface", "Unconfirmed dashed ring"],
  ["ui", "tier-verified", "sunk", "Verified roundel on sunk well"],
  ["ui", "tier-corroborated", "sunk", "Corroborated rings on sunk well"],
  ["ui", "tier-listed", "sunk", "Listed ring on sunk well"],
];

const themes = { light: {}, dark: systemDark };
const rows = [];
let failed = false;

for (const key of Object.keys(systemDark)) {
  if (systemDark[key] !== forcedDark[key]) {
    console.error(`Dark blocks disagree on --${key}: ${systemDark[key]} vs ${forcedDark[key]}`);
    failed = true;
  }
}

for (const [kind, fg, bg, use] of PAIRS) {
  const row = { kind, fg, bg, use };
  for (const [theme, vars] of Object.entries(themes)) {
    const back = resolve(vars, `color-${bg}`);
    const pageBg = resolve(vars, "color-bg");
    const solidBack = back[3] < 1 ? over(back, pageBg) : back;
    const front = over(resolve(vars, `color-${fg}`), solidBack);
    const value = ratio(front, solidBack);
    row[theme] = value;
    if (value < MIN[kind]) failed = true;
  }
  rows.push(row);
}

const fmt = (n) => `${n.toFixed(2)}:1`;
if (process.argv.includes("--markdown")) {
  console.log("| Use | Foreground | Background | Min | Light | Dark |");
  console.log("|---|---|---|---|---|---|");
  for (const r of rows) {
    console.log(`| ${r.use} | \`--color-${r.fg}\` | \`--color-${r.bg}\` | ${MIN[r.kind]}:1 | ${fmt(r.light)} | ${fmt(r.dark)} |`);
  }
} else {
  for (const r of rows) {
    const mark = r.light < MIN[r.kind] || r.dark < MIN[r.kind] ? "FAIL" : "ok  ";
    console.log(`${mark} ${r.kind.padEnd(5)} ${`${r.fg} on ${r.bg}`.padEnd(36)} light ${fmt(r.light).padStart(8)}  dark ${fmt(r.dark).padStart(8)}`);
  }
}

if (failed) {
  console.error("Contrast check failed.");
  process.exit(1);
}
