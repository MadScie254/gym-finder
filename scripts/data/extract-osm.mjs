/**
 * OSM fitness extract (Overpass) with full contact/hours tags.
 *
 * Degrades gracefully: every network call has a timeout, unreachable mirrors are
 * skipped after a short probe, and when all of them fail the run keeps the
 * previous data/source/osm-venues.json (or, if there is none, imports the
 * checked-in legacy catalogue). Either way the snapshot is written with
 * osmStale: true and a staleReason, which build-gyms.mjs puts in the manifest.
 * Exit code is 0 in degraded mode; it is 1 only when no OSM data exists at all.
 *
 * Env: OSM_OFFLINE=1 skips the network (use the stale path); OSM_MIN_VENUES
 * (default 30) is the sanity floor for a live extract; OVERPASS_ENDPOINTS is a
 * comma-separated list of interpreter URLs that replaces the built-in mirrors.
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isInKenya } from "./geo.mjs";
import { importLegacyOsm } from "./import-legacy-osm.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "data", "source", "osm-venues.json");
const USER_AGENT = "FindMyGym/1.0 (https://github.com/MadScie254/gym-finder; catalog-build)";
const ENDPOINTS = process.env.OVERPASS_ENDPOINTS?.split(",").map((url) => url.trim()).filter(Boolean) ?? [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
/** A reachable server answers any HTTP request quickly; a dead one resets or hangs. */
const PROBE_TIMEOUT_MS = 8_000;
/** The query itself carries [timeout:180]; allow a little more before giving up. */
const QUERY_TIMEOUT_MS = 200_000;
const MIN_VENUES = Number(process.env.OSM_MIN_VENUES ?? 30);

const QUERY = `
[out:json][timeout:180];
(
  nwr["leisure"="fitness_centre"](-4.9,33.75,5.57,41.91);
  nwr["amenity"="gym"](-4.9,33.75,5.57,41.91);
  nwr["amenity"="fitness_centre"](-4.9,33.75,5.57,41.91);
  nwr["leisure"="sports_centre"]["name"~"gym|fitness|crossfit",i](-4.9,33.75,5.57,41.91);
  nwr["leisure"="fitness_station"](-4.9,33.75,5.57,41.91);
  nwr["sport"="fitness"](-4.9,33.75,5.57,41.91);
  nwr["name"~"gym|fitness|workout|crossfit|bodybuild",i]["amenity"](-4.9,33.75,5.57,41.91);
  nwr["name"~"gym|fitness|workout|crossfit",i]["shop"](-4.9,33.75,5.57,41.91);
);
out center tags;
`;

function describe(error) {
  const code = error?.cause?.code ?? error?.code ?? (["TimeoutError", "AbortError"].includes(error?.name) ? error.name : null);
  return `${error?.message ?? error}${code && !String(error?.message).includes(code) ? ` (${code})` : ""}`;
}

function locationOf(element) {
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  if (lat == null || lng == null || !isInKenya({ lat, lng })) return null;
  return { lat, lng };
}

function mapElement(element) {
  const tags = element.tags ?? {};
  const location = locationOf(element);
  if (!location) return null;
  const name = tags.name || tags["name:en"];
  if (!name) return null;
  return {
    id: `osm:${element.type}/${element.id}`,
    osmType: element.type,
    osmId: element.id,
    name,
    lat: location.lat,
    lng: location.lng,
    tags,
  };
}

async function probe(endpoint) {
  const statusUrl = endpoint.replace(/interpreter$/, "status");
  await fetch(statusUrl, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
}

async function fetchOverpass(endpoint) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: `data=${encodeURIComponent(QUERY)}`,
    signal: AbortSignal.timeout(QUERY_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload.elements)) throw new Error("response has no elements array");
  if (/runtime error|timed out|out of memory/i.test(payload.remark ?? "")) {
    throw new Error(`Overpass remark: ${payload.remark}`);
  }
  return payload;
}

function toVenues(payload) {
  const unique = new Map();
  for (const element of payload.elements) {
    const venue = mapElement(element);
    if (venue) unique.set(venue.id, venue);
  }
  return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Try each mirror in turn; returns { venues } or { failures }. */
async function queryMirrors() {
  const failures = [];
  if (process.env.OSM_OFFLINE === "1") return { failures: ["OSM_OFFLINE=1"] };
  for (const endpoint of ENDPOINTS) {
    const host = new URL(endpoint).host;
    try {
      await probe(endpoint);
    } catch (error) {
      console.warn(`${host}: unreachable (${describe(error)})`);
      failures.push(`${host}: unreachable (${describe(error)})`);
      continue;
    }
    try {
      console.log(`Querying ${host} ...`);
      const venues = toVenues(await fetchOverpass(endpoint));
      if (venues.length < MIN_VENUES) throw new Error(`only ${venues.length} venues (sanity floor ${MIN_VENUES})`);
      return { venues, endpoint };
    } catch (error) {
      console.warn(`${host}: query failed (${describe(error)})`);
      failures.push(`${host}: ${describe(error)}`);
    }
  }
  return { failures };
}

async function readSnapshot() {
  if (!existsSync(OUT)) return null;
  try {
    const snapshot = JSON.parse(await readFile(OUT, "utf8"));
    return Array.isArray(snapshot.venues) ? snapshot : null;
  } catch {
    return null;
  }
}

async function degrade(failures) {
  const reason = `Overpass unavailable: ${failures.join("; ")}`.slice(0, 600);
  const previous = await readSnapshot();
  if (previous) {
    previous.osmStale = true;
    previous.staleReason = reason;
    previous.staleCheckedAt = new Date().toISOString();
    const tmp = `${OUT}.tmp`;
    await writeFile(tmp, JSON.stringify(previous, null, 2));
    await rename(tmp, OUT);
    console.warn(`Overpass failed; kept previous OSM snapshot (${previous.venues.length} venues, snapshot ${previous.generatedAt}) and marked osmStale`);
    return;
  }
  console.warn("Overpass failed and there is no previous OSM snapshot; importing the legacy catalogue");
  await importLegacyOsm({ reason, force: true });
}

async function main() {
  await mkdir(path.dirname(OUT), { recursive: true });
  const result = await queryMirrors();
  if (!result.venues) {
    await degrade(result.failures);
    return;
  }
  const tmp = `${OUT}.tmp`;
  await writeFile(tmp, JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: "OpenStreetMap / Overpass",
    endpoint: new URL(result.endpoint).host,
    osmStale: false,
    count: result.venues.length,
    venues: result.venues,
  }, null, 2));
  await rename(tmp, OUT);
  console.log(`Wrote ${result.venues.length} OSM venues`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
