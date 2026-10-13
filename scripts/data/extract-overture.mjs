/**
 * Extract Kenyan fitness venues and landmarks from Overture Places.
 * Prefers DuckDB CLI (works on Node 26 / Windows). Falls back to @duckdb/node-api.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = path.join(ROOT, "data", "source");
const STAC = "https://stac.overturemaps.org/catalog.json";

function duckdbBin() {
  const local = process.platform === "win32"
    ? path.join(ROOT, "tools", "duckdb.exe")
    : path.join(ROOT, "tools", "duckdb");
  if (existsSync(local)) return local;
  const which = spawnSync(process.platform === "win32" ? "where" : "which", ["duckdb"], { encoding: "utf8" });
  return which.status === 0 ? which.stdout.trim().split(/\r?\n/)[0] : null;
}

async function latestRelease() {
  const response = await fetch(STAC);
  if (!response.ok) throw new Error(`STAC ${response.status}`);
  const catalog = await response.json();
  const latest = catalog.links?.find((link) => link.rel === "latest" || link.title === "latest");
  const href = latest?.href ?? "";
  const match = href.match(/(\d{4}-\d{2}-\d{2}\.\d+)/);
  return match?.[1] ?? "2026-09-23.1";
}

async function httpsParquetList(release) {
  const prefix = `release/${release}/theme=places/type=place/`;
  const listUrl = `https://overturemaps-us-west-2.s3.amazonaws.com/?list-type=2&prefix=${prefix}`;
  const xml = await (await fetch(listUrl)).text();
  const keys = [...xml.matchAll(/<Key>([^<]+\.parquet)<\/Key>/g)].map((m) => m[1]);
  if (!keys.length) throw new Error("No parquet keys from HTTPS list");
  return keys.map((key) => `https://overturemaps-us-west-2.s3.amazonaws.com/${key}`);
}

function venueWhere() {
  return `(
    taxonomy.primary IN ('gym','yoga_studio','pilates_studio','martial_arts_club','boxing_class','gymnastics_center','boot_camp')
    OR basic_category IN ('gym','fitness_studio')
    OR regexp_matches(lower(coalesce(names.primary, '')), '\\b(gym|fitness|crossfit|workout|bodybuilding)\\b')
  )`;
}

function landmarkWhere() {
  return `(
    taxonomy.primary IN ('shopping_mall','college_university','stadium','bus_station')
    OR basic_category IN ('shopping_mall','college_university','stadium','bus_station')
  )`;
}

function selectSql(source, extraWhere, outPath) {
  const posix = outPath.replaceAll("\\", "/");
  return `
INSTALL httpfs; LOAD httpfs;
SET s3_region='us-west-2';
COPY (
  SELECT id,
         names.primary AS name,
         taxonomy.primary AS tax,
         taxonomy.hierarchy AS hier,
         basic_category AS basic,
         confidence,
         addresses[1].freeform AS addr,
         addresses[1].locality AS locality,
         addresses[1].region AS region,
         addresses[1].country AS country,
         phones, websites, socials, emails,
         list_transform(sources, s -> s.dataset) AS srcs,
         list_transform(sources, s -> s.license) AS lics,
         list_transform(sources, s -> s.update_time) AS upd,
         operating_status,
         bbox.xmin AS lng, bbox.ymin AS lat
  FROM read_parquet(${source}, hive_partitioning=false)
  WHERE bbox.xmin BETWEEN 33.75 AND 41.91
    AND bbox.ymin BETWEEN -4.9 AND 5.57
    AND ${extraWhere}
) TO '${posix}' (FORMAT json);
`;
}

function runSql(bin, sql) {
  const result = spawnSync(bin, ["-c", sql], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `duckdb exited ${result.status}`);
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const release = process.env.OVERTURE_RELEASE || await latestRelease();
  console.log(`Overture release ${release}`);
  const urls = await httpsParquetList(release);
  const source = `[${urls.map((url) => `'${url}'`).join(", ")}]`;
  const venuePath = path.join(OUT_DIR, "overture-venues.json");
  const landmarkPath = path.join(OUT_DIR, "overture-landmarks.json");
  const bin = duckdbBin();
  if (!bin) {
    throw new Error("DuckDB CLI not found. Place duckdb.exe in tools/ or install @duckdb/node-api bindings for this Node version.");
  }
  console.log(`Using ${bin}`);
  runSql(bin, selectSql(source, venueWhere(), venuePath));
  runSql(bin, selectSql(source, landmarkWhere(), landmarkPath));
  await writeFile(
    path.join(OUT_DIR, "overture-meta.json"),
    JSON.stringify({ release, extractedAt: new Date().toISOString() }, null, 2),
  );
  console.log(`Wrote venues + landmarks for ${release}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
