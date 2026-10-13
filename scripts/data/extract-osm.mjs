/**
 * OSM fitness extract with full contact/hours tags. Reuses the previous
 * snapshot when every Overpass mirror fails (osmStale: true).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "data", "source", "osm-venues.json");
const BOUNDARY = JSON.parse(await readFile(path.join(ROOT, "data", "kenya-boundary.json"), "utf8"));
const USER_AGENT = "FindMyGym/1.0 (https://github.com/MadScie254/gym-finder; catalog-build)";
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

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

function locationOf(element) {
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (lat == null || lon == null) return null;
  const insideRing = (ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  if (!BOUNDARY.polygons.some((polygon) =>
    insideRing(polygon[0]) && !polygon.slice(1).some(insideRing))) return null;
  return { lat, lng: lon };
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

async function fetchOverpass(endpoint) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: `data=${encodeURIComponent(QUERY)}`,
  });
  if (!response.ok) throw new Error(`${endpoint} → ${response.status}`);
  return response.json();
}

async function main() {
  await mkdir(path.dirname(OUT), { recursive: true });
  let payload = null;
  let lastError = null;
  for (const endpoint of ENDPOINTS) {
    try {
      console.log(`Querying ${endpoint} …`);
      payload = await fetchOverpass(endpoint);
      break;
    } catch (error) {
      lastError = error;
      console.warn(String(error));
    }
  }
  if (!payload) {
    if (existsSync(OUT)) {
      const previous = JSON.parse(await readFile(OUT, "utf8"));
      previous.osmStale = true;
      previous.staleReason = String(lastError);
      await writeFile(OUT, JSON.stringify(previous, null, 2));
      console.warn("Reusing previous OSM snapshot; marked osmStale");
      return;
    }
    throw lastError ?? new Error("All Overpass endpoints failed");
  }
  const unique = new Map();
  for (const element of payload.elements ?? []) {
    const venue = mapElement(element);
    if (venue) unique.set(venue.id, venue);
  }
  const venues = [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
  await writeFile(OUT, JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: "OpenStreetMap / Overpass",
    osmStale: false,
    count: venues.length,
    venues,
  }, null, 2));
  console.log(`Wrote ${venues.length} OSM venues`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
