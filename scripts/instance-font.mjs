// Regenerates src/ui/fonts/archivo-signwriter.woff2 from the Fontsource Archivo
// variable file (latin subset, wdth + wght axes).
//
// Why: the Fontsource latin file covers wdth 62-125 and wght 100-900 and weighs
// 90 KB. The design system only uses wdth 75-100 and wght 400-800, so the axes
// are limited with fontTools' instancer. Result: one file, about 58 KB.
//
// Needs Python with fontTools and brotli:  pip install fonttools brotli
// Run:  node scripts/instance-font.mjs [path/to/python]
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2");
const OUT = path.join(ROOT, "src/ui/fonts/archivo-signwriter.woff2");
const python = process.argv[2] ?? "python3";
const work = mkdtempSync(path.join(tmpdir(), "font-"));
const partial = path.join(work, "partial.ttf");

try {
  execFileSync(python, ["-m", "fontTools.varLib.instancer", SOURCE, "wdth=75:100", "wght=400:800", "-o", partial], { stdio: "inherit" });
  execFileSync(python, ["-c", [
    "import sys",
    "from fontTools.ttLib import TTFont",
    "f = TTFont(sys.argv[1]); f.flavor = 'woff2'; f.save(sys.argv[2])",
  ].join("\n"), partial, OUT], { stdio: "inherit" });
  console.log(`${path.relative(ROOT, OUT)}: ${(statSync(OUT).size / 1024).toFixed(1)} KB`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
