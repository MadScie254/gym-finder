/**
 * Pulls mapped fitness venues for Kenya from Overpass into data/kenya-gyms.json.
 * Run: node scripts/fetch-kenya-gyms.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "kenya-gyms.json");
const BOUNDARY = JSON.parse(readFileSync(path.join(ROOT, "data", "kenya-boundary.json"), "utf8"));
const USER_AGENT = "KenyaGymFinder/1.0 (https://github.com/MadScie254/gym-finder; catalog-build)";

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
  if (lat < -4.9 || lat > 5.57 || lon < 33.75 || lon > 41.91) return null;
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

function isFitnessVenue(venue) {
  if (/^(fitness centre|fitness center|gym|fitness station)$/i.test(venue.name.trim())) return false;
  if (venue.types.some((value) => ["parking", "pitch", "stadium", "track", "shop"].includes(value))) return false;
  if (/parking lot|sports pitch|\btrack\b|\bhome\b/i.test(venue.name) && !/\b(gym|fitness|crossfit)\b/i.test(venue.name)) return false;
  if (venue.types.some((value) => ["fitness_centre", "fitness_station", "gym", "fitness"].includes(value))) return true;
  return /\b(gym|gymnasium|fitness|crossfit|bodybuilding|workout)\b/i.test(venue.name);
}

function addressFrom(tags = {}) {
  return (
    tags["addr:full"] ||
    [tags["addr:housenumber"], tags["addr:street"], tags["addr:suburb"], tags["addr:city"], tags["addr:county"]]
      .filter(Boolean)
      .join(", ") ||
    "Kenya"
  );
}

function priceFrom(tags = {}) {
  const fee = `${tags.fee || tags.charge || ""}`.toLowerCase();
  if (fee === "no" || fee === "free") return "PRICE_LEVEL_FREE";
  return null;
}

function typesFrom(tags = {}) {
  return [tags.leisure, tags.amenity, tags.sport, tags.fitness_station]
    .filter(Boolean)
    .flatMap((value) => value.split(/[;,]/).map((part) => part.trim().toLowerCase()));
}

function openNowFrom(tags = {}) {
  const hours = tags.opening_hours?.toLowerCase() ?? "";
  if (!hours) return null;
  if (hours.includes("24/7")) return true;
  return null;
}

function mapElement(element) {
  const tags = element.tags ?? {};
  const location = locationOf(element);
  if (!location) return null;
  const gym = {
    id: `${element.type}/${element.id}`,
    name: tags.name || tags["name:en"] || "Fitness centre",
    address: addressFrom(tags),
    location,
    rating: null,
    userRatingCount: 0,
    priceLevel: priceFrom(tags),
    openNow: openNowFrom(tags),
    types: typesFrom(tags),
    photoName: null,
    googleMapsUri: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    phone: tags.phone || tags["contact:phone"] || null,
    website: tags.website || tags["contact:website"] || null,
    weekdayHours: tags.opening_hours ? [tags.opening_hours] : [],
    reviews: [],
    editorialSummary:
      [tags.description, tags.sport, tags.leisure]
        .filter(Boolean)
        .map((value) => value.replaceAll("_", " "))
        .join(" · ") || null,
    distanceKm: null,
    score: 0,
    labels: [],
  };
  return isFitnessVenue(gym) ? gym : null;
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
  if (!response.ok) {
    throw new Error(`${endpoint} → ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function main() {
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
    throw lastError ?? new Error("All Overpass endpoints failed");
  }

  const unique = new Map();
  for (const element of payload.elements ?? []) {
    const gym = mapElement(element);
    if (gym) unique.set(gym.id, gym);
  }
  const gyms = [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(
    OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "OpenStreetMap / Overpass",
        count: gyms.length,
        gyms,
      },
      null,
      2,
    ),
  );
  console.log(`Wrote ${gyms.length} gyms → ${OUT}`);
}

async function curateExisting() {
  const payload = JSON.parse(readFileSync(OUT, "utf8"));
  const gyms = payload.gyms.filter((gym) =>
    locationOf({ lat: gym.location.lat, lon: gym.location.lng }) && isFitnessVenue(gym));
  await writeFile(OUT, JSON.stringify({ ...payload, curatedAt: new Date().toISOString(), count: gyms.length, gyms }, null, 2));
  console.log(`Curated ${gyms.length} existing gym listings → ${OUT}`);
}

(process.argv.includes("--curate-existing") ? curateExisting() : main()).catch((error) => {
  console.error(error);
  process.exit(1);
});
