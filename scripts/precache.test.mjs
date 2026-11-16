import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { afterEach, expect, it } from "vitest";

const SCRIPT = fileURLToPath(new URL("./precache.mjs", import.meta.url));
const SW = readFileSync(fileURLToPath(new URL("../public/sw.js", import.meta.url)), "utf8");
const tempDirs = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function dist(files, sw = SW) {
  const dir = mkdtempSync(path.join(tmpdir(), "fmg-precache-"));
  tempDirs.push(dir);
  mkdirSync(path.join(dir, "assets"));
  mkdirSync(path.join(dir, "data"));
  for (const [name, body] of Object.entries(files)) writeFileSync(path.join(dir, name), body);
  writeFileSync(path.join(dir, "data", "manifest.json"), JSON.stringify({ gymsPath: "/data/gyms.abc.json" }));
  writeFileSync(path.join(dir, "sw.js"), sw);
  return dir;
}

function run(dir) {
  return spawnSync(process.execPath, [SCRIPT], { encoding: "utf8", env: { ...process.env, PRERENDER_DIST: dir } });
}

const listOf = (dir) => JSON.parse(/const PRECACHE = (\[[^\]]*\]);/.exec(readFileSync(path.join(dir, "sw.js"), "utf8"))[1]);
const buildOf = (dir) => /const BUILD = "([^"]*)";/.exec(readFileSync(path.join(dir, "sw.js"), "utf8"))[1];

it("lists the built scripts, styles and fonts but not source maps", () => {
  const dir = dist({ "assets/index-1.js": "a", "assets/index-1.js.map": "m", "assets/app-2.css": "c", "assets/font-3.woff2": "f", "data/landmarks.json": "[]" });
  const result = run(dir);
  expect(result.status, result.stderr).toBe(0);
  expect(listOf(dir)).toEqual(["/assets/app-2.css", "/assets/font-3.woff2", "/assets/index-1.js", "/data/landmarks.json"]);
});

it("names the cache after the build, so a new set of files or a new catalogue replaces the old cache", () => {
  const first = dist({ "assets/index-1.js": "a" });
  const second = dist({ "assets/index-2.js": "a" });
  expect(run(first).status).toBe(0);
  expect(run(second).status).toBe(0);
  expect(buildOf(first)).toMatch(/^[0-9a-f]{10}$/);
  expect(buildOf(first)).not.toBe(buildOf(second));

  const same = dist({ "assets/index-1.js": "a" });
  expect(run(same).status).toBe(0);
  expect(buildOf(same)).toBe(buildOf(first));
});

it("fails the build instead of shipping a worker it could not fill in", () => {
  const dir = dist({ "assets/index-1.js": "a" }, "self.addEventListener('fetch', () => {});");
  const result = run(dir);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("BUILD or PRECACHE");
});
