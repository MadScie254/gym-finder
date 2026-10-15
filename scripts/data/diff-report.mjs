/**
 * Markdown diff between the published build and a previous one, for the data-refresh PR
 * body (brief 5.9): counts by tier, added / removed / renamed names, venues that lost a
 * source, and how many pairs and deny-list hits wait for a human.
 *
 *   node scripts/data/diff-report.mjs [previous/manifest.json]
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TIERS = ["verified", "corroborated", "listed", "unconfirmed"];
const LIMIT = 40;

function loadGyms(manifestPath) {
  if (!manifestPath || !existsSync(manifestPath)) return [];
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const file = path.join(ROOT, "public", `${manifest.gymsPath ?? ""}`.replace(/^\//, ""));
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")).gyms ?? [] : [];
}

const readList = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : []);
const tierCounts = (gyms) => Object.fromEntries(TIERS.map((tier) => [tier, gyms.filter((v) => v.trust?.tier === tier).length]));
const section = (title, rows) => (rows.length
  ? `## ${title} (${rows.length})\n${rows.slice(0, LIMIT).map((row) => `- ${row}`).join("\n")}${rows.length > LIMIT ? `\n- ... and ${rows.length - LIMIT} more` : ""}`
  : "");

/**
 * @param {object[]} current published venues
 * @param {object[]} previous venues of the previous build ([] when there is none)
 * @param {{ review?: object[], hits?: object[] }} [logs] data/source side logs
 */
export function diffReport(current, previous, { review = [], hits = [] } = {}) {
  const before = new Map(previous.map((v) => [v.id, v]));
  // A venue whose id changed but which absorbed the old id as an alias is the same venue.
  for (const venue of current) for (const alias of venue.aliases ?? []) if (!before.has(venue.id) && before.has(alias)) before.set(venue.id, before.get(alias));
  const now = new Set(current.flatMap((v) => [v.id, ...(v.aliases ?? [])]));
  const added = current.filter((v) => !before.has(v.id)).map((v) => `${v.name} (${v.county ?? "?"}, ${v.trust.tier})`);
  const removed = previous.filter((v) => !now.has(v.id)).map((v) => `${v.name} (${v.county ?? "?"})`);
  const renamed = current.filter((v) => before.has(v.id) && before.get(v.id).name !== v.name).map((v) => `${before.get(v.id).name} -> ${v.name}`);
  const lostSource = current
    .filter((v) => before.has(v.id))
    .map((v) => ({ v, lost: (before.get(v.id).trust?.sources ?? []).filter((s) => !(v.trust.sources ?? []).includes(s)) }))
    .filter(({ lost }) => lost.length)
    .map(({ v, lost }) => `${v.name}: no longer in ${lost.join(", ")}`);
  const tierMoves = current
    .filter((v) => before.has(v.id) && before.get(v.id).trust?.tier !== v.trust.tier)
    .map((v) => `${v.name}: ${before.get(v.id).trust?.tier} -> ${v.trust.tier}`);

  const was = tierCounts(previous);
  const is = tierCounts(current);
  const reviewKinds = {};
  for (const pair of review) reviewKinds[pair.reason] = (reviewKinds[pair.reason] ?? 0) + 1;
  const removedHits = hits.filter((hit) => hit.action === "removed" && !`${hit.rule}`.startsWith("category:")).length;

  const header = [
    "# Find My Gym data diff",
    "",
    `- Total: ${current.length}${previous.length ? ` (was ${previous.length})` : ""}`,
    `- By tier: ${TIERS.map((tier) => `${tier} ${is[tier]}${previous.length ? ` (was ${was[tier]})` : ""}`).join(", ")}`,
    `- Added ${added.length}, removed ${removed.length}, renamed ${renamed.length}, lost a source ${lostSource.length}, changed tier ${tierMoves.length}`,
    `- Waiting for a human: ${review.length} review pairs (${Object.entries(reviewKinds).map(([k, n]) => `${k} ${n}`).join(", ") || "none"}), ${removedHits} deny-list/exclude removals (data/source/denylist-hits.json)`,
  ].join("\n");
  const sections = [
    section("Added", added),
    section("Removed", removed),
    section("Renamed", renamed),
    section("Lost a source", lostSource),
    section("Changed tier", tierMoves),
  ].filter(Boolean);
  return [header, ...sections].join("\n\n");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const current = loadGyms(path.join(ROOT, "public", "data", "manifest.json"));
  const previous = loadGyms(process.argv[2]);
  console.log(diffReport(current, previous, {
    review: readList(path.join(ROOT, "data", "source", "review-candidates.json")),
    hits: readList(path.join(ROOT, "data", "source", "denylist-hits.json")),
  }));
}
