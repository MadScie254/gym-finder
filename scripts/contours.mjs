// Topographic contour lines for the page texture behind the glass layers.
// Value noise with warped coordinates, marching squares, segments chained into polylines.
// Writes two SVG masks, minor and major lines, to src/ui/texture/. Deterministic: same bytes every run.
// Usage: node scripts/contours.mjs   (npm run texture)
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const W = 1920;
const H = 1200;

function hash(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 100000) / 100000;
}

const smooth = (t) => t * t * (3 - 2 * t);

function noise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smooth(x - x0);
  const ty = smooth(y - y0);
  const a = hash(x0, y0, seed);
  const b = hash(x0 + 1, y0, seed);
  const c = hash(x0, y0 + 1, seed);
  const d = hash(x0 + 1, y0 + 1, seed);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

/** A smooth height field. The coordinates are warped so the lines swirl like real terrain. */
function field(px, py) {
  const wx = px + 90 * noise(px / 260, py / 260, 7);
  const wy = py + 90 * noise(px / 260 + 40, py / 260 + 40, 11);
  return 0.62 * noise(wx / 330, wy / 330, 3) + 0.28 * noise(wx / 140, wy / 140, 5) + 0.1 * noise(wx / 60, wy / 60, 9);
}

/** The path data of one level: marching squares, segments chained into long polylines. */
function levelPath(grid, cols, rows, cell, level) {
  const at = (i, j) => grid[j * cols + i];
  const points = new Map();
  const links = new Map();
  const add = (id, x, y) => { if (!points.has(id)) points.set(id, [Math.round(x), Math.round(y)]); };
  const join = (a, b) => {
    if (!links.has(a)) links.set(a, []);
    if (!links.has(b)) links.set(b, []);
    links.get(a).push(b);
    links.get(b).push(a);
  };
  for (let j = 0; j < rows - 1; j += 1) {
    for (let i = 0; i < cols - 1; i += 1) {
      const v0 = at(i, j);
      const v1 = at(i + 1, j);
      const v2 = at(i + 1, j + 1);
      const v3 = at(i, j + 1);
      const code = (v0 > level ? 1 : 0) | (v1 > level ? 2 : 0) | (v2 > level ? 4 : 0) | (v3 > level ? 8 : 0);
      if (code === 0 || code === 15) continue;
      const x = i * cell;
      const y = j * cell;
      const top = `h${i},${j}`;
      const bottom = `h${i},${j + 1}`;
      const left = `v${i},${j}`;
      const right = `v${i + 1},${j}`;
      const t = (a, b) => (level - a) / (b - a);
      add(top, x + t(v0, v1) * cell, y);
      add(bottom, x + t(v3, v2) * cell, y + cell);
      add(left, x, y + t(v0, v3) * cell);
      add(right, x + cell, y + t(v1, v2) * cell);
      const table = {
        1: [[left, top]], 2: [[top, right]], 3: [[left, right]], 4: [[right, bottom]], 5: [[left, top], [right, bottom]],
        6: [[top, bottom]], 7: [[left, bottom]], 8: [[left, bottom]], 9: [[top, bottom]], 10: [[top, right], [left, bottom]],
        11: [[right, bottom]], 12: [[left, right]], 13: [[top, right]], 14: [[left, top]],
      };
      for (const [a, b] of table[code]) join(a, b);
    }
  }

  const seen = new Set();
  const chains = [];
  const walk = (start) => {
    const chain = [start];
    seen.add(start);
    let current = start;
    for (;;) {
      const next = links.get(current).find((id) => !seen.has(id));
      if (next === undefined) break;
      chain.push(next);
      seen.add(next);
      current = next;
    }
    // A loop returns to where it began.
    if (chain.length > 2 && links.get(current).includes(start)) chain.push(start);
    chains.push(chain);
  };
  // Open lines first, from their ends, then whatever is left are closed loops.
  const ids = [...links.keys()].sort();
  for (const id of ids) if (!seen.has(id) && links.get(id).length === 1) walk(id);
  for (const id of ids) if (!seen.has(id)) walk(id);

  const num = (n, first) => (n < 0 || first ? String(n) : ` ${n}`);
  return chains.map((chain) => {
    const [x0, y0] = points.get(chain[0]);
    let d = `M${x0} ${y0}l`;
    let px = x0;
    let py = y0;
    chain.slice(1).forEach((id, index) => {
      const [x, y] = points.get(id);
      d += index === 0 ? `${x - px} ${y - py}` : `${num(x - px, false)}${num(y - py, false)}`;
      px = x;
      py = y;
    });
    return d;
  }).join("");
}

const svg = (d, width) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><path d="${d}" fill="none" stroke="#000" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/></svg>\n`;

/** Both masks as SVG text. Every fourth level is a major line. */
export function generateContours({ cell = 24, levels = 20 } = {}) {
  const cols = Math.ceil(W / cell) + 1;
  const rows = Math.ceil(H / cell) + 1;
  const grid = new Float64Array(cols * rows);
  for (let j = 0; j < rows; j += 1) for (let i = 0; i < cols; i += 1) grid[j * cols + i] = field(i * cell, j * cell);
  const minor = [];
  const major = [];
  for (let k = 1; k <= levels; k += 1) {
    const level = 0.18 + (0.62 * k) / (levels + 1);
    (k % 4 === 0 ? major : minor).push(levelPath(grid, cols, rows, cell, level));
  }
  return { minor: svg(minor.join(""), 2), major: svg(major.join(""), 2.8) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = fileURLToPath(new URL("../src/ui/texture/", import.meta.url));
  mkdirSync(dir, { recursive: true });
  const { minor, major } = generateContours();
  writeFileSync(`${dir}contours-minor.svg`, minor);
  writeFileSync(`${dir}contours-major.svg`, major);
  console.log(`contours: minor ${minor.length} bytes, major ${major.length} bytes, total ${minor.length + major.length}`);
}
