/** One-shot: turn the checked-in 58-gym catalog into an OSM snapshot if Overpass is down. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = path.join(ROOT, "data", "kenya-gyms.json");
const OUT = path.join(ROOT, "data", "source", "osm-venues.json");

if (existsSync(OUT)) {
  console.log("OSM snapshot already exists; not overwriting");
  process.exit(0);
}

const payload = JSON.parse(await readFile(SRC, "utf8"));
const venues = (payload.gyms ?? []).map((gym) => {
  const [osmType, osmId] = `${gym.id}`.split("/");
  return {
    id: `osm:${gym.id}`,
    osmType,
    osmId,
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
await writeFile(OUT, JSON.stringify({
  generatedAt: payload.generatedAt ?? new Date().toISOString(),
  source: "legacy kenya-gyms.json (Overpass unavailable)",
  osmStale: true,
  count: venues.length,
  venues,
}, null, 2));
console.log(`Imported ${venues.length} legacy OSM venues`);
