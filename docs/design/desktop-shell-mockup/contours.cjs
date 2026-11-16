// Throwaway: topographic contour lines as the page texture behind the glass layers.
// Value noise + marching squares, written as an SVG of line segments.
const fs = require("fs");
const W = 1920, H = 1200, CELL = 12;
const cols = Math.ceil(W / CELL) + 1, rows = Math.ceil(H / CELL) + 1;

function hash(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 100000) / 100000;
}
const smooth = (t) => t * t * (3 - 2 * t);
function noise(x, y, seed) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const tx = smooth(x - x0), ty = smooth(y - y0);
  const a = hash(x0, y0, seed), b = hash(x0 + 1, y0, seed), c = hash(x0, y0 + 1, seed), d = hash(x0 + 1, y0 + 1, seed);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}
function field(px, py) {
  // Large, slow relief with a little finer grain. Warp the coordinates so lines swirl like real terrain.
  const wx = px + 90 * noise(px / 260, py / 260, 7);
  const wy = py + 90 * noise(px / 260 + 40, py / 260 + 40, 11);
  return 0.62 * noise(wx / 330, wy / 330, 3) + 0.28 * noise(wx / 140, wy / 140, 5) + 0.10 * noise(wx / 60, wy / 60, 9);
}
const grid = [];
for (let j = 0; j < rows; j++) {
  const row = [];
  for (let i = 0; i < cols; i++) row.push(field(i * CELL, j * CELL));
  grid.push(row);
}
function lerp(a, b, level) { return (level - a) / (b - a); }
function segmentsFor(level) {
  const out = [];
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const v0 = grid[j][i], v1 = grid[j][i + 1], v2 = grid[j + 1][i + 1], v3 = grid[j + 1][i];
      const idx = (v0 > level ? 1 : 0) | (v1 > level ? 2 : 0) | (v2 > level ? 4 : 0) | (v3 > level ? 8 : 0);
      if (idx === 0 || idx === 15) continue;
      const x = i * CELL, y = j * CELL;
      const top = [x + lerp(v0, v1, level) * CELL, y];
      const right = [x + CELL, y + lerp(v1, v2, level) * CELL];
      const bottom = [x + lerp(v3, v2, level) * CELL, y + CELL];
      const left = [x, y + lerp(v0, v3, level) * CELL];
      const table = { 1: [[left, top]], 2: [[top, right]], 3: [[left, right]], 4: [[right, bottom]], 5: [[left, top], [right, bottom]], 6: [[top, bottom]], 7: [[left, bottom]], 8: [[left, bottom]], 9: [[top, bottom]], 10: [[top, right], [left, bottom]], 11: [[right, bottom]], 12: [[left, right]], 13: [[top, right]], 14: [[left, top]] };
      for (const [p, q] of table[idx]) out.push(`M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`);
    }
  }
  return out.join("");
}
const minor = [], major = [];
const LEVELS = 22;
for (let k = 1; k <= LEVELS; k++) {
  const level = 0.18 + (0.62 * k) / LEVELS;
  (k % 4 === 0 ? major : minor).push(segmentsFor(level));
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">
<rect width="${W}" height="${H}" fill="#f2f4f7"/>
<path d="${minor.join("")}" fill="none" stroke="#1b2333" stroke-opacity="0.11" stroke-width="1.1" stroke-linecap="round"/>
<path d="${major.join("")}" fill="none" stroke="#2346d8" stroke-opacity="0.26" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;
fs.writeFileSync(__dirname + "/contours.svg", svg);
console.log("contours.svg", (svg.length / 1024).toFixed(0) + " KB");
