/**
 * Extract Kenyan fitness venues and landmarks from Overture Places.
 *
 * Engine order: a DuckDB CLI if one exists (DUCKDB_BIN, tools/duckdb[.exe], or
 * `duckdb` on PATH), otherwise the @duckdb/node-api bindings (devDependency).
 * No CLI is needed on CI (Node 24 + node-api). Parquet is read over HTTPS from
 * the public bucket, never s3://, because some egress proxies inject fake AWS
 * credentials that break anonymous s3:// reads.
 *
 * Output (newline-delimited JSON, which build-gyms.mjs loadJsonRecords reads):
 *   data/source/overture-venues.json     fitness taxonomy OR name-regex matches
 *   data/source/overture-landmarks.json  malls, universities, stadiums, bus stations
 *   data/source/overture-meta.json       release id, counts, engine
 * The bounding box also admits TZ/UG/ET/SS/SO rows. Rows keep `country` and
 * lat/lng; build-gyms.mjs gates on country KE and the Kenya polygon.
 *
 * Env: OVERTURE_RELEASE pins a release id; DUCKDB_BIN pins a CLI binary;
 * OVERTURE_MIN_VENUES (default 250) is the sanity floor for country-KE venue
 * rows. Below it the run fails and the previous outputs are left untouched.
 */
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = path.join(ROOT, "data", "source");
const STAC = "https://stac.overturemaps.org/catalog.json";
const BUCKET = "https://overturemaps-us-west-2.s3.amazonaws.com";
const RELEASE_RE = /\d{4}-\d{2}-\d{2}\.\d+/;
const HTTP_TIMEOUT_MS = 30_000;
const QUERY_ATTEMPTS = 3;

/** Kenya bounding box, same as the OSM extract. */
const BBOX = { xmin: 33.75, xmax: 41.91, ymin: -4.9, ymax: 5.57 };
/** Real Overture taxonomy.primary values (September 2026 schema). */
const VENUE_TAX = ["gym", "yoga_studio", "pilates_studio", "martial_arts_club", "boxing_class", "gymnastics_center", "boot_camp"];
const VENUE_BASIC = ["gym", "fitness_studio"];
/** Same word list as NAME_KEEP in build-gyms.mjs so both sides agree. */
const NAME_REGEX = String.raw`\b(gym|fitness|crossfit|workout|bodybuilding)\b`;
const LANDMARK_TAX = ["shopping_mall", "college_university", "bus_station", "stadium_arena", "soccer_stadium", "football_stadium"];

const quote = (values) => values.map((v) => `'${v}'`).join(", ");
const venuePredicate = `(
    taxonomy."primary" IN (${quote(VENUE_TAX)})
    OR basic_category IN (${quote(VENUE_BASIC)})
    OR regexp_matches(lower(coalesce(names."primary", '')), '${NAME_REGEX}')
  )`;
const landmarkPredicate = `taxonomy."primary" IN (${quote(LANDMARK_TAX)})`;

function compareReleases(a, b) {
  const [dateA, nA] = a.split(".");
  const [dateB, nB] = b.split(".");
  return dateA === dateB ? Number(nA) - Number(nB) : dateA.localeCompare(dateB);
}

async function fetchText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  return response.text();
}

/** STAC exposes the newest release as a top-level `latest` field. */
async function latestRelease() {
  if (process.env.OVERTURE_RELEASE) return process.env.OVERTURE_RELEASE;
  const catalog = JSON.parse(await fetchText(STAC));
  if (typeof catalog.latest === "string" && RELEASE_RE.test(catalog.latest)) return catalog.latest.match(RELEASE_RE)[0];
  const children = (catalog.links ?? [])
    .filter((link) => link.rel === "child")
    .map((link) => `${link.href ?? ""} ${link.title ?? ""}`.match(RELEASE_RE)?.[0])
    .filter(Boolean)
    .sort(compareReleases);
  if (!children.length) throw new Error("Could not read the latest Overture release from STAC; set OVERTURE_RELEASE.");
  return children.at(-1);
}

/** List the Places parquet files over HTTPS (handles S3 pagination). */
async function httpsParquetList(release) {
  const prefix = `release/${release}/theme=places/type=place/`;
  const keys = [];
  let token = null;
  do {
    const url = `${BUCKET}/?list-type=2&prefix=${prefix}${token ? `&continuation-token=${encodeURIComponent(token)}` : ""}`;
    const xml = await fetchText(url);
    keys.push(...[...xml.matchAll(/<Key>([^<]+\.parquet)<\/Key>/g)].map((m) => m[1]));
    token = xml.match(/<IsTruncated>true<\/IsTruncated>/) ? xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/)?.[1] ?? null : null;
  } while (token);
  if (!keys.length) throw new Error(`No Places parquet files listed for release ${release}`);
  return keys.map((key) => `${BUCKET}/${key}`);
}

function duckdbBin() {
  const candidates = [
    process.env.DUCKDB_BIN,
    path.join(ROOT, "tools", process.platform === "win32" ? "duckdb.exe" : "duckdb"),
  ].filter(Boolean);
  const local = candidates.find((file) => existsSync(file));
  if (local) return local;
  const which = spawnSync(process.platform === "win32" ? "where" : "which", ["duckdb"], { encoding: "utf8" });
  return which.status === 0 ? which.stdout.trim().split(/\r?\n/)[0] : null;
}

const PRELUDE = "INSTALL httpfs; LOAD httpfs; SET threads=8; SET http_timeout=120; SET http_retries=6;";

/** CLI engine: one process per statement on a scratch database file. */
function cliEngine(bin, workDir) {
  const db = path.join(workDir, "work.duckdb");
  return {
    name: `cli (${bin})`,
    async exec(sql) {
      const result = spawnSync(bin, ["-json", db], {
        input: `${PRELUDE}\n${sql}`,
        encoding: "utf8",
        maxBuffer: 256 * 1024 * 1024,
        timeout: 20 * 60 * 1000,
      });
      if (result.status !== 0) throw new Error(result.stderr || result.stdout || `duckdb exited ${result.status}`);
      const out = result.stdout.trim();
      return out ? JSON.parse(out) : [];
    },
    async close() {},
  };
}

/** node-api engine: one in-memory connection for the whole run. */
async function nodeEngine() {
  let api;
  try {
    api = await import("@duckdb/node-api");
  } catch (error) {
    throw new Error(
      `No DuckDB CLI found and @duckdb/node-api failed to load (${error.message}). ` +
        "Run `npm ci` on a supported Node version, or put a DuckDB CLI in tools/ (or set DUCKDB_BIN).",
    );
  }
  const instance = await api.DuckDBInstance.create(":memory:");
  const connection = await instance.connect();
  await connection.run(PRELUDE);
  return {
    name: "node-api (@duckdb/node-api)",
    async exec(sql) {
      const reader = await connection.runAndReadAll(sql);
      return reader.getRowObjectsJson();
    },
    async close() {
      connection.closeSync?.();
      instance.closeSync?.();
    },
  };
}

async function openEngine(workDir) {
  const bin = duckdbBin();
  return bin ? cliEngine(bin, workDir) : nodeEngine();
}

async function withRetry(label, fn) {
  let lastError;
  for (let attempt = 1; attempt <= QUERY_ATTEMPTS; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`${label} failed (attempt ${attempt}/${QUERY_ATTEMPTS}): ${String(error.message ?? error).slice(0, 300)}`);
      if (attempt < QUERY_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
    }
  }
  throw lastError;
}

function candidatesSql(urls) {
  const files = `[${urls.map((url) => `'${url}'`).join(", ")}]`;
  return `
CREATE OR REPLACE TABLE candidates AS
SELECT id,
       names."primary"                              AS name,
       taxonomy."primary"                           AS tax,
       taxonomy.hierarchy                           AS hier,
       taxonomy.alternates                          AS alts,
       basic_category                               AS basic,
       confidence,
       addresses[1].freeform                        AS addr,
       addresses[1].locality                        AS locality,
       addresses[1].postcode                        AS postcode,
       addresses[1].region                          AS region,
       addresses[1].country                         AS country,
       phones, websites, socials, emails,
       brand.names."primary"                        AS brand,
       list_transform(sources, s -> s.dataset)      AS srcs,
       list_transform(sources, s -> s.license)      AS lics,
       list_transform(sources, s -> s.update_time)  AS upd,
       sources,
       bbox.xmin AS lng, bbox.ymin AS lat,
       ${venuePredicate}  AS is_venue,
       ${landmarkPredicate} AS is_landmark
FROM read_parquet(${files}, hive_partitioning=false)
WHERE bbox.xmin BETWEEN ${BBOX.xmin} AND ${BBOX.xmax}
  AND bbox.ymin BETWEEN ${BBOX.ymin} AND ${BBOX.ymax}
  AND (${venuePredicate} OR ${landmarkPredicate})`;
}

const VENUE_COLUMNS = `id, name, tax, hier, alts, basic, confidence, addr, locality, postcode, region, country,
       phones, websites, socials, emails, brand, srcs, lics, upd, sources, lng, lat`;
const LANDMARK_COLUMNS = "id, name, tax, basic, confidence, locality, region, country, upd, lng, lat";

const sqlPath = (file) => file.replaceAll("\\", "/").replaceAll("'", "''");

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const release = await latestRelease();
  console.log(`Overture release ${release}`);
  const urls = await httpsParquetList(release);
  console.log(`${urls.length} Places parquet files (HTTPS)`);

  const workDir = await mkdtemp(path.join(os.tmpdir(), "overture-extract-"));
  const engine = await openEngine(workDir);
  console.log(`Engine: ${engine.name}`);
  const venueTmp = path.join(OUT_DIR, "overture-venues.json.tmp");
  const landmarkTmp = path.join(OUT_DIR, "overture-landmarks.json.tmp");
  try {
    await withRetry("Kenya bbox scan", async () => {
      await engine.exec(candidatesSql(urls));
    });
    const counts = (await engine.exec(`
      SELECT count(*) FILTER (WHERE is_venue) AS venues,
             count(*) FILTER (WHERE is_venue AND country = 'KE') AS venues_ke,
             count(*) FILTER (WHERE is_venue AND country IS NULL) AS venues_null_country,
             count(*) FILTER (WHERE is_landmark) AS landmarks
      FROM candidates`))[0];
    const venueRows = Number(counts.venues);
    const venuesKe = Number(counts.venues_ke);
    const landmarkRows = Number(counts.landmarks);
    console.log(`venues=${venueRows} (country KE ${venuesKe}, no country ${counts.venues_null_country}) landmarks=${landmarkRows}`);

    const floor = Number(process.env.OVERTURE_MIN_VENUES ?? 250);
    if (venuesKe < floor || landmarkRows < 100) {
      throw new Error(
        `Sanity floor tripped: ${venuesKe} country-KE venues (floor ${floor}), ${landmarkRows} landmarks (floor 100). ` +
          "Possible upstream schema change. Previous outputs were left untouched.",
      );
    }

    await engine.exec(`COPY (SELECT ${VENUE_COLUMNS} FROM candidates WHERE is_venue ORDER BY id) TO '${sqlPath(venueTmp)}' (FORMAT json)`);
    await engine.exec(`COPY (SELECT ${LANDMARK_COLUMNS} FROM candidates WHERE is_landmark ORDER BY id) TO '${sqlPath(landmarkTmp)}' (FORMAT json)`);
    await rename(venueTmp, path.join(OUT_DIR, "overture-venues.json"));
    await rename(landmarkTmp, path.join(OUT_DIR, "overture-landmarks.json"));
    await writeFile(
      path.join(OUT_DIR, "overture-meta.json"),
      JSON.stringify({
        release,
        extractedAt: new Date().toISOString(),
        engine: engine.name,
        parquetFiles: urls.length,
        venueRows,
        venueRowsCountryKE: venuesKe,
        landmarkRows,
      }, null, 2),
    );
    console.log(`Wrote overture-venues.json (${venueRows}), overture-landmarks.json (${landmarkRows}) for ${release}`);
  } finally {
    await engine.close();
    await rm(workDir, { recursive: true, force: true });
    await rm(venueTmp, { force: true });
    await rm(landmarkTmp, { force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
