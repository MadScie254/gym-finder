/**
 * Turn the checked-in 58-gym OSM catalogue (data/kenya-gyms.json) into an OSM
 * snapshot at data/source/osm-venues.json. Used when Overpass is unreachable and
 * no previous snapshot exists (extract-osm.mjs calls this). The snapshot is
 * always marked osmStale: true. Run directly: `node scripts/data/import-legacy-osm.mjs`.
 * An existing snapshot is never overwritten unless `force` is set (--force).
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = path.join(ROOT, "data", "kenya-gyms.json");
const OUT = path.join(ROOT, "data", "source", "osm-venues.json");

export async function importLegacyOsm({ reason = "Overpass unavailable; imported the checked-in legacy catalogue", force = false } = {}) {
  if (existsSync(OUT) && !force) {
    console.log("OSM snapshot already exists; not overwriting");
    return { skipped: true, count: null, file: OUT };
  }
  if (!existsSync(SRC)) throw new Error(`Legacy catalogue not found: ${SRC}`);
  const payload = JSON.parse(await readFile(SRC, "utf8"));
  const venues = (payload.gyms ?? []).map((gym) => {
    const [osmType, osmId] = `${gym.id}`.split("/");
    return {
      id: `osm:${gym.id}`,
      osmType,
      osmId: Number(osmId),
      name: gym.name,
      lat: gym.location.lat,
      lng: gym.location.lng,
      tags: {
        name: gym.name,
        phone: gym.phone || undefined,
        website: gym.website || undefined,
        opening_hours: gym.weekdayHours?.[0] || undefined,
        "addr:full": gym.address && gym.address !== "Kenya" ? gym.address : undefined,
      },
    };
  });
  await mkdir(path.dirname(OUT), { recursive: true });
  const tmp = `${OUT}.tmp`;
  await writeFile(tmp, JSON.stringify({
    generatedAt: payload.generatedAt ?? new Date().toISOString(),
    source: "legacy kenya-gyms.json (Overpass unavailable)",
    osmStale: true,
    staleReason: reason,
    count: venues.length,
    venues,
  }, null, 2));
  await rename(tmp, OUT);
  console.log(`Imported ${venues.length} legacy OSM venues (osmStale: true)`);
  return { skipped: false, count: venues.length, file: OUT };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  importLegacyOsm({ force: process.argv.includes("--force") }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
