// Writes the list of built files into dist/sw.js so the service worker can precache them.
// Runs after vite build and prerender. Source maps are left out.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = process.env.PRERENDER_DIST ? path.resolve(process.env.PRERENDER_DIST) : path.join(ROOT, "dist");

const assets = (await readdir(path.join(DIST, "assets"))).filter((name) => !name.endsWith(".map")).sort();
const list = assets.map((name) => `/assets/${name}`);
for (const extra of ["/data/landmarks.json", "/icons/icon.svg", "/icons/apple-touch-icon.png"]) {
  if (existsSync(path.join(DIST, extra))) list.push(extra);
}

const swPath = path.join(DIST, "sw.js");
const source = await readFile(swPath, "utf8");
const manifest = existsSync(path.join(DIST, "data", "manifest.json")) ? await readFile(path.join(DIST, "data", "manifest.json"), "utf8") : "";
// The id changes with the files and the catalogue, so a new catalogue also gives browsers a new worker.
const build = createHash("sha256").update(JSON.stringify(list)).update(manifest).update(source).digest("hex").slice(0, 10);

const BUILD = /const BUILD = "[^"]*";/;
const PRECACHE = /const PRECACHE = \[[^\]]*\];/;
if (!BUILD.test(source) || !PRECACHE.test(source)) throw new Error("dist/sw.js has no BUILD or PRECACHE line to fill in");
await writeFile(swPath, source.replace(BUILD, () => `const BUILD = "${build}";`).replace(PRECACHE, () => `const PRECACHE = ${JSON.stringify(list)};`));
console.log(`precache: ${list.length} files, build ${build}`);
