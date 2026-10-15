/**
 * Build the static catalogue: OSM + Overture (+ web research) -> normalise -> deny-list ->
 * merge -> overrides -> trust tiers -> public/data/{gyms.<hash>.json, manifest.json, landmarks.json}.
 *
 * Deterministic: same inputs and the same BUILD_AS_OF date give byte-identical output
 * (no wall-clock in the files, sorted records, no unordered keys). Rebuilding is a no-op.
 * Env: BUILD_AS_OF=YYYY-MM-DD pins the trust/staleness reference date.
 * Side logs for humans (gitignored) go to data/source/: denylist-hits.json,
 * review-candidates.json, dropped-phones.json, research-log.json.
 */
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assemble } from "./assemble.mjs";
import { denyMatch, softDenyReason } from "./denylist.mjs";
import { COUNTIES, inferCounties } from "./geo.mjs";
import { loadResearch, researchToRecords } from "./import-research.mjs";
import { buildLandmarks } from "./landmarks.mjs";
import { sortedObject } from "./merge-records.mjs";
import { pairKey, slugify } from "./merge-rules.mjs";
import { normalizeOsm, normalizeOverture } from "./normalize.mjs";
import { applyOverride, loadOverrides, matchesKnownClosed, overrideFor } from "./overrides.mjs";
import { carrySlugs, loadPrevious, previousSummary, publishGyms, writeAtomic } from "./publish.mjs";
import { buildDate, computeTrust } from "./trust.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = path.join(ROOT, "data", "source");
const PUBLIC_DATA = path.join(ROOT, "public", "data");
const OVERRIDES = path.join(ROOT, "data", "overrides");
const RESEARCH_FILE = path.join(ROOT, "data", "research", "venues-researched.json");

async function loadJsonRecords(file) {
  if (!existsSync(file)) return [];
  const trimmed = (await readFile(file, "utf8")).trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) return JSON.parse(trimmed);
  if (trimmed.startsWith("{") && !trimmed.includes("\n{")) {
    const parsed = JSON.parse(trimmed);
    return parsed.venues ?? parsed.gyms ?? parsed.records ?? [parsed];
  }
  return trimmed.split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

const readJsonMaybe = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : fallback);
const round6 = (value) => Math.round(value * 1e6) / 1e6;
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const pct = (part, whole) => (whole ? Math.round((1000 * part) / whole) / 10 : 0);

function toPublic(v) {
  return {
    id: v.id,
    slug: v.slug,
    aliases: v.aliases,
    name: v.name,
    ...(v.nameRaw && v.nameRaw !== v.name ? { nameRaw: v.nameRaw } : {}),
    kind: v.kind,
    lat: round6(v.lat),
    lng: round6(v.lng),
    area: v.area,
    town: v.town,
    county: v.county,
    address: v.address,
    phones: v.phones,
    whatsapp: v.whatsapp,
    website: v.website,
    instagram: v.instagram,
    facebook: v.facebook,
    hours: v.hours,
    fee: v.fee,
    amenities: sortedObject(v.amenities ?? {}),
    trust: v.trust,
    provenance: sortedObject(v.provenance),
    osmUrl: v.osmUrl,
  };
}

function licensesFor(venues, hasResearch) {
  const datasets = new Set(venues.flatMap((v) => v.overtureDatasets ?? []));
  const sources = new Set(venues.flatMap((v) => v.sources));
  const licenses = [];
  if (sources.has("osm") || venues.length) licenses.push("ODbL-1.0: © OpenStreetMap contributors (this merged dataset is published as an ODbL derivative)");
  licenses.push(`CDLA-Permissive-2.0: Overture Maps Foundation Places${datasets.has("meta") ? " (Meta business data)" : ""}${datasets.has("microsoft") ? " and Microsoft" : ""}`);
  if (datasets.has("foursquare")) licenses.push("Apache-2.0: Foursquare Open Source Places, transformed to the Overture schema");
  if (datasets.has("alltheplaces")) licenses.push("CC0-1.0: AllThePlaces (via Overture)");
  licenses.push("CC BY 4.0: GeoNames gazetteer (neighbourhood and town names)");
  licenses.push("geoBoundaries gbOpen Kenya boundary (licence to be confirmed with counsel before commercial launch)");
  if (hasResearch) licenses.push("Web research: facts only (name, phone, address, hours text) from public pages; evidence URLs are kept in each venue's provenance. No page text, photos or ratings are copied.");
  return licenses;
}

const NOTICES = [
  "Overture Places can contain duplicates and incomplete properties. Confidence measures existence, not that a gym is open.",
  "Address is omitted when unknown. We never invent hours, prices or ratings.",
  "Verified means a Find My Gym reviewer confirmed the listing within the last 12 months. Listed and Corroborated come from open map and business data (and, where a venue says so, web research); they are not confirmations.",
];

async function main() {
  const asOf = buildDate();
  const overrides = loadOverrides(OVERRIDES);
  const excluded = new Map(overrides.exclude.map((row) => [row.id, row.reason]));
  const allowed = new Set(overrides.allow.map((row) => row.id));
  const forcedPairs = new Set(overrides.merge.map((pair) => pairKey(pair.a, pair.b)));
  const previous = loadPrevious(PUBLIC_DATA);

  const overtureRows = await loadJsonRecords(path.join(SOURCE, "overture-venues.json"));
  const landmarkRows = await loadJsonRecords(path.join(SOURCE, "overture-landmarks.json"));
  const osmPayload = readJsonMaybe(path.join(SOURCE, "osm-venues.json"), { venues: [], osmStale: true });
  const meta = readJsonMaybe(path.join(SOURCE, "overture-meta.json"), { release: null });
  const research = loadResearch(RESEARCH_FILE);

  // 1. Normalise, then the deny-list pass (every removal is logged for a human).
  const records = [];
  const ghosts = [];
  const hits = [];
  const skipped = { overture: {}, osm: {}, web: {} };
  const droppedPhones = [];
  const triage = (result, source) => {
    if (result.skip) {
      skipped[source][result.skip] = (skipped[source][result.skip] ?? 0) + 1;
      return;
    }
    if (result.hit) {
      hits.push({ ...result.hit, source, action: "removed" });
      return;
    }
    const record = result.record;
    if (record.droppedPhones?.length) droppedPhones.push({ id: record.id, name: record.name, dropped: record.droppedPhones });
    const base = { id: record.id, name: record.name, source };
    if (excluded.has(record.id)) {
      hits.push({ ...base, rule: "exclude.json", reason: excluded.get(record.id), action: "removed" });
      ghosts.push({ ...record, removedBy: "exclude.json" });
      return;
    }
    const denied = allowed.has(record.id) ? null : denyMatch(record.name);
    if (denied) {
      hits.push({ ...base, rule: `denylist:${denied}`, ...(record.overtureConfidence != null ? { confidence: Math.round(record.overtureConfidence * 100) / 100 } : {}), action: "removed" });
      ghosts.push({ ...record, removedBy: "denylist" });
      return;
    }
    if (source !== "osm") {
      const soft = softDenyReason(record.name);
      if (soft) {
        record.softDeny = soft;
        hits.push({ ...base, rule: `non-fitness-name:${soft}`, action: "unconfirmed" });
      }
    }
    records.push(record);
  };
  for (const row of overtureRows) triage(normalizeOverture(row), "overture");
  for (const row of osmPayload.venues ?? []) triage(normalizeOsm(row), "osm");
  const researchInfo = research ? researchToRecords(research, { asOf }) : null;
  for (const record of researchInfo?.records ?? []) {
    if (record.web.closed) records.push(record);
    else triage({ record }, "web");
  }
  const placed = inferCounties(records);
  const intake = placed.filter((record) => !record.web?.closed);

  // 2. Merge duplicates (never on proximity alone) and apply web-research closures.
  const assembled = assemble(placed, { forcedPairs, ghosts, tombstones: ghosts });

  // 3. Overrides, owner-reported closures, trust tiers.
  const venues = [];
  const removed = { overrideClosed: [], knownClosed: [] };
  const warnings = [];
  const usedOverrides = new Set();
  for (const merged of assembled.venues) {
    const override = overrideFor(overrides.venues, merged);
    if (override) usedOverrides.add(override.id);
    if (override?.closed) {
      removed.overrideClosed.push({ id: merged.id, name: merged.name });
      continue;
    }
    const closedEntry = overrides.knownClosed.find((entry) => matchesKnownClosed(merged, entry));
    if (closedEntry) {
      removed.knownClosed.push({ id: merged.id, name: merged.name });
      continue;
    }
    const applied = applyOverride(merged, override);
    warnings.push(...applied.warnings);
    venues.push({ ...applied.venue, trust: computeTrust(applied.venue, override, { asOf }) });
  }
  for (const id of overrides.venues.keys()) {
    if (!usedOverrides.has(id)) warnings.push(`override ${id}: no catalogue venue has this id or alias (closed, merged away, or typo)`);
  }

  // 4. Stable slugs (hash collisions lengthen the hash), old slugs kept as aliases.
  venues.sort((a, b) => cmp(a.id, b.id));
  const taken = new Set();
  for (const venue of venues) {
    let extra = 0;
    let slug = slugify(venue.name, venue.id);
    while (taken.has(slug)) slug = slugify(venue.name, venue.id, (extra += 1));
    taken.add(slug);
    venue.slug = slug;
  }
  const carried = carrySlugs(previous, venues);
  for (const venue of venues) venue.aliases = [...new Set([...venue.aliases, ...(carried.get(venue.id) ?? [])])];

  const gyms = venues.map(toPublic);
  const body = JSON.stringify({ gyms });
  const gymsName = await publishGyms(PUBLIC_DATA, body);

  // 5. Manifest (no wall-clock: builtAt is the build day, so identical inputs give identical files).
  const byTier = { verified: 0, corroborated: 0, listed: 0, unconfirmed: 0 };
  const byCounty = Object.fromEntries(COUNTIES.map((county) => [county.name, 0]));
  const visibleByCounty = { ...byCounty };
  const byKind = {};
  const bySource = {};
  let visible = 0;
  let withContact = 0;
  let withPhone = 0;
  for (const venue of gyms) {
    const shown = venue.trust.tier !== "unconfirmed";
    byTier[venue.trust.tier] += 1;
    byCounty[venue.county] = (byCounty[venue.county] ?? 0) + 1;
    byKind[venue.kind] = (byKind[venue.kind] ?? 0) + 1;
    const combo = venue.trust.sources.join("+");
    bySource[combo] = (bySource[combo] ?? 0) + 1;
    if (!shown) continue;
    visible += 1;
    visibleByCounty[venue.county] = (visibleByCounty[venue.county] ?? 0) + 1;
    if (venue.phones.length) withPhone += 1;
    if (venue.phones.length || venue.website || venue.whatsapp) withContact += 1;
  }
  const landmarks = buildLandmarks(landmarkRows);
  const gymsPath = `/data/${gymsName}`;
  const manifest = {
    builtAt: `${asOf}T00:00:00.000Z`,
    overtureRelease: meta.release ?? null,
    osmSnapshotAt: osmPayload.generatedAt ?? null,
    osmStale: Boolean(osmPayload.osmStale),
    ...(osmPayload.osmStale && osmPayload.staleReason ? { osmStaleReason: osmPayload.staleReason } : {}),
    researchAt: researchInfo?.researchAt ?? null,
    counts: {
      total: gyms.length,
      defaultVisible: visible,
      withContact,
      withPhone,
      byTier,
      byCounty,
      visibleByCounty,
      byKind: sortedObject(byKind),
      bySource: sortedObject(bySource),
      landmarks: landmarks.counts,
    },
    previous: previousSummary(previous, gymsPath),
    licenses: licensesFor(venues, Boolean(researchInfo)),
    notices: NOTICES,
    gymsPath,
  };
  await writeAtomic(path.join(PUBLIC_DATA, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeAtomic(path.join(PUBLIC_DATA, "landmarks.json"), JSON.stringify({ landmarks: landmarks.landmarks }));

  // 6. Logs for humans.
  const hitOrder = (a, b) => cmp(a.rule, b.rule) || cmp(a.name, b.name) || cmp(a.id, b.id);
  await writeAtomic(path.join(SOURCE, "denylist-hits.json"), `${JSON.stringify(hits.sort(hitOrder), null, 2)}\n`);
  await writeAtomic(path.join(SOURCE, "review-candidates.json"), `${JSON.stringify(assembled.review, null, 2)}\n`);
  await writeAtomic(path.join(SOURCE, "dropped-phones.json"), `${JSON.stringify(droppedPhones, null, 2)}\n`);
  if (researchInfo) {
    await writeAtomic(path.join(SOURCE, "research-log.json"), `${JSON.stringify({
      researchAt: researchInfo.researchAt,
      counts: researchInfo.counts,
      skipped: researchInfo.skipped,
      removedByClosedFinding: assembled.researchClosed,
      blockedByRemovedRecord: assembled.researchBlocked,
      ambiguousMatch: assembled.researchAmbiguous,
    }, null, 2)}\n`);
  }

  summarize({ meta, osmPayload, overtureRows, intake, assembled, hits, skipped, droppedPhones, removed, warnings, researchInfo, manifest, gyms, visible, withContact, withPhone, landmarks, gymsName });
}

function summarize(s) {
  const { manifest, gyms, visible, withContact, withPhone, assembled, hits } = s;
  const reasons = {};
  for (const merge of assembled.merges) reasons[merge.reason] = (reasons[merge.reason] ?? 0) + 1;
  const hitCount = (prefix) => hits.filter((hit) => hit.rule.startsWith(prefix)).length;
  const reviewKinds = {};
  for (const pair of assembled.review) reviewKinds[pair.reason] = (reviewKinds[pair.reason] ?? 0) + 1;
  const osmIntake = s.intake.filter((record) => record.sources.includes("osm")).length;
  const osmMatched = gyms.filter((venue) => venue.trust.sources.includes("osm") && venue.trust.sources.includes("overture")).length;
  const nairobi = manifest.counts.visibleByCounty.Nairobi ?? 0;
  const oneLine = (object) => Object.entries(object).map(([k, v]) => `${k} ${v}`).join(", ") || "none";
  const lines = [
    `sources: overture ${s.overtureRows.length} rows (release ${s.meta.release ?? "none"}), osm ${s.osmPayload.venues?.length ?? 0} (${s.osmPayload.osmStale ? "stale" : "live"}), web ${s.researchInfo ? `${s.researchInfo.counts.total} researched` : "no research file"}`,
    `skipped: overture [${oneLine(s.skipped.overture)}], osm [${oneLine(s.skipped.osm)}]`,
    `removed: category ${hitCount("category:")}, denylist ${hitCount("denylist:")}, exclude.json ${hitCount("exclude.json")}; demoted to unconfirmed by name ${hitCount("non-fitness-name:")}; known-closed ${s.removed.knownClosed.length}, override-closed ${s.removed.overrideClosed.length}; research-closed ${assembled.researchClosed.length}, research-ambiguous ${assembled.researchAmbiguous.length}`,
    `merge: ${s.intake.length} records -> ${gyms.length} venues; links by [${oneLine(reasons)}]; review pairs ${assembled.review.length} [${oneLine(reviewKinds)}]`,
    `OSM gyms also in Overture: ${osmMatched}/${osmIntake} (${pct(osmMatched, osmIntake)}%)`,
    `phones dropped (invalid or non-Kenyan): ${s.droppedPhones.reduce((n, row) => n + row.dropped.length, 0)} on ${s.droppedPhones.length} records`,
    `tiers: ${oneLine(manifest.counts.byTier)}; sources: ${oneLine(manifest.counts.bySource)}`,
    `catalogue: total ${gyms.length}, visible ${visible}, Nairobi visible ${nairobi}, with contact action ${withContact} (${pct(withContact, visible)}%), with phone ${withPhone} (${pct(withPhone, visible)}%)`,
    `landmarks: ${oneLine(s.landmarks.counts)} (${(s.landmarks.gzipBytes / 1024).toFixed(1)} KB gzip)`,
    `targets: visible>=400 ${visible >= 400 ? "met" : "NOT met"}, Nairobi>=150 ${nairobi >= 150 ? "met" : "NOT met"}, contact>=75% ${pct(withContact, visible) >= 75 ? "met" : "NOT met"}`,
    `output: ${s.gymsName}`,
    ...s.warnings.map((warning) => `warning: ${warning}`),
  ];
  console.log(lines.join("\n"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
