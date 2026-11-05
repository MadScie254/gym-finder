import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function loadGyms(manifestPath) {
  if (!existsSync(manifestPath)) return [];
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const file = path.join(ROOT, "public", manifest.gymsPath.replace(/^\//, ""));
  if (!existsSync(file)) return [];
  return JSON.parse(readFileSync(file, "utf8")).gyms ?? [];
}

const current = loadGyms(path.join(ROOT, "public", "data", "manifest.json"));
const previousPath = process.argv[2];
const previous = previousPath ? loadGyms(previousPath) : [];
const currNames = new Map(current.map((v) => [v.id, v.name]));
const prevNames = new Map(previous.map((v) => [v.id, v.name]));
const added = current.filter((v) => !prevNames.has(v.id)).map((v) => v.name);
const removed = previous.filter((v) => !currNames.has(v.id)).map((v) => v.name);
const renamed = current.filter((v) => prevNames.has(v.id) && prevNames.get(v.id) !== v.name)
  .map((v) => `${prevNames.get(v.id)} → ${v.name}`);
const lostSource = current.filter((v) => (v.trust.sources?.length ?? 0) === 1 && prevNames.has(v.id));

const lines = [
  `# Find My Gym data diff`,
  ``,
  `- Total: ${current.length}`,
  `- Added: ${added.length}`,
  `- Removed: ${removed.length}`,
  `- Renamed: ${renamed.length}`,
  ``,
  added.length ? `## Added\n${added.slice(0, 40).map((n) => `- ${n}`).join("\n")}` : "",
  removed.length ? `## Removed\n${removed.slice(0, 40).map((n) => `- ${n}`).join("\n")}` : "",
  renamed.length ? `## Renamed\n${renamed.slice(0, 40).map((n) => `- ${n}`).join("\n")}` : "",
  lostSource.length ? `## Lost a source\n${lostSource.slice(0, 20).map((v) => `- ${v.name}`).join("\n")}` : "",
].filter(Boolean);

console.log(lines.join("\n"));
