import { readFileSync } from "node:fs";
import path from "node:path";
import { haversineKm, isInKenya } from "./kenya";
import { isFitnessVenue } from "./fitnessVenue";
import type { Gym, LatLng } from "./types";

type CatalogFile = {
  generatedAt?: string;
  count?: number;
  gyms: Gym[];
};

let cached: Gym[] | null = null;

function loadCatalog(): Gym[] {
  if (cached) return cached;
  try {
    const filePath = path.join(process.cwd(), "data", "kenya-gyms.json");
    const payload = JSON.parse(readFileSync(filePath, "utf8")) as CatalogFile;
    cached = Array.isArray(payload.gyms)
      ? payload.gyms.filter((gym) => isInKenya(gym.location) && isFitnessVenue(gym))
      : [];
  } catch {
    cached = [];
  }
  return cached;
}

/** Instant nearby lookup from the checked-in Kenya OSM catalog. */
export function catalogNearbyGyms(center: LatLng, radiusMeters: number, limit = 60): Gym[] {
  const radiusKm = radiusMeters / 1000;
  return loadCatalog()
    .map((gym) => ({
      ...gym,
      distanceKm: haversineKm(center, gym.location),
    }))
    .filter((gym) => (gym.distanceKm ?? Infinity) <= radiusKm)
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
    .slice(0, limit)
    .map((gym) => ({ ...gym, distanceKm: null, score: 0, labels: [] }));
}

/** Every mapped gym in the Kenya catalog, nearest to `center` first. */
export function catalogAllGyms(center: LatLng): Gym[] {
  return loadCatalog()
    .map((gym) => ({
      ...gym,
      distanceKm: haversineKm(center, gym.location),
    }))
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
    .map((gym) => ({ ...gym, distanceKm: null, score: 0, labels: [] }));
}

export function catalogGymById(id: string): Gym | null {
  return loadCatalog().find((gym) => gym.id === id) ?? null;
}

/** Keyless, offline fallback for a submitted gym or address search. */
export function catalogSearchGyms(query: string, limit = 60): Gym[] {
  const needle = query.trim().toLocaleLowerCase();
  if (needle.length < 2) return [];
  return loadCatalog()
    .filter((gym) => `${gym.name} ${gym.address}`.toLocaleLowerCase().includes(needle))
    .sort((a, b) => {
      const aName = a.name.toLocaleLowerCase();
      const bName = b.name.toLocaleLowerCase();
      return Number(bName.startsWith(needle)) - Number(aName.startsWith(needle)) || aName.localeCompare(bName);
    })
    .slice(0, limit);
}

export function catalogStats(): { count: number } {
  return { count: loadCatalog().length };
}
