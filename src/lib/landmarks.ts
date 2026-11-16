import MiniSearch from "minisearch";
import { fuzzyEdits } from "../data/loadVenues";
import type { LatLng, Venue } from "../data/types";
import { foldPlace } from "./filterVenues";
import { haversineKm } from "./kenya";
import { slugify } from "./slug";

export type LandmarkKind = "shopping_mall" | "college_university" | "bus_station";
export type Landmark = LatLng & { id: string; slug: string; name: string; kind: LandmarkKind };
type RawLandmark = LatLng & { id: string; name: string; kind: string };

/** Gyms within this distance of a landmark are "near" it. */
export const NEAR_KM = 3;
const DUPLICATE_KM = 0.5;
const KINDS = new Set<string>(["shopping_mall", "college_university", "bus_station"]);

/**
 * Clean the raw list: drop near-duplicates ("Sarit Centre Administration" beside "Sarit Centre",
 * a shop named after its mall) and give each landmark a readable, stable slug.
 */
export function prepareLandmarks(raw: readonly RawLandmark[]): Landmark[] {
  const rows = raw
    .filter((row) => row.name?.trim() && KINDS.has(row.kind) && Number.isFinite(row.lat) && Number.isFinite(row.lng))
    .map((row) => ({ ...row, folded: foldPlace(row.name) }))
    .sort((a, b) => a.folded.length - b.folded.length || a.id.localeCompare(b.id));
  const kept: typeof rows = [];
  for (const row of rows) {
    const duplicate = kept.some((other) => row.folded.includes(other.folded)
      && haversineKm(row, other) <= (row.folded === other.folded ? 1 : DUPLICATE_KM));
    if (!duplicate) kept.push(row);
  }
  const used = new Map<string, number>();
  return kept
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((row) => {
      const base = slugify(row.name) || "place";
      const n = (used.get(base) ?? 0) + 1;
      used.set(base, n);
      return { id: row.id, name: row.name.trim(), kind: row.kind as LandmarkKind, lat: row.lat, lng: row.lng, slug: n === 1 ? base : `${base}-${n}` };
    });
}

let cached: Promise<Landmark[]> | null = null;

/** Fetched on first use (213 KB), never part of the first load. */
export function loadLandmarks(fetcher: typeof fetch = fetch): Promise<Landmark[]> {
  cached ??= fetcher("/data/landmarks.json")
    .then((response) => {
      if (!response.ok) throw new Error(`Landmarks ${response.status}`);
      return response.json() as Promise<{ landmarks: RawLandmark[] }>;
    })
    .then((payload) => prepareLandmarks(payload.landmarks ?? []))
    .catch((error: unknown) => { cached = null; throw error; });
  return cached;
}

/** "near yaya", "gyms near Sarit" and "gym near the junction" all name a landmark. */
export function parseNearQuery(query: string): string | null {
  const match = /^\s*(?:gyms?\s+)?(?:near|close to|karibu na)\s+(?:the\s+)?(.+?)\s*$/i.exec(query);
  return match ? match[1] : null;
}

const searchers = new WeakMap<readonly Landmark[], MiniSearch<Landmark>>();

function searcherFor(list: readonly Landmark[]): MiniSearch<Landmark> {
  let search = searchers.get(list);
  if (!search) {
    search = new MiniSearch<Landmark>({
      fields: ["name"],
      storeFields: ["id"],
      searchOptions: { fuzzy: (term) => fuzzyEdits(term), prefix: true, combineWith: "AND" },
    });
    search.addAll(list);
    searchers.set(list, search);
  }
  return search;
}

/** Typo-tolerant landmark lookup. Shopping centres and bus stations rank above colleges on a tie. */
export function searchLandmarks(list: readonly Landmark[], query: string, limit = 4): Landmark[] {
  const text = (parseNearQuery(query) ?? query).trim();
  if (text.length < 2) return [];
  const byId = new Map(list.map((item) => [item.id, item]));
  const weight = (kind: LandmarkKind) => (kind === "college_university" ? 0.8 : 1);
  return searcherFor(list).search(text)
    .map((hit) => ({ landmark: byId.get(hit.id), score: hit.score }))
    .filter((row): row is { landmark: Landmark; score: number } => Boolean(row.landmark))
    .sort((a, b) => b.score * weight(b.landmark.kind) - a.score * weight(a.landmark.kind))
    .slice(0, limit)
    .map((row) => row.landmark);
}

/** Gyms within `radiusKm` of a point, nearest first. */
export function gymsNear(venues: readonly Venue[], point: LatLng, radiusKm = NEAR_KM): Venue[] {
  return venues
    .map((venue) => ({ venue, km: haversineKm(point, venue) }))
    .filter((row) => row.km <= radiusKm)
    .sort((a, b) => a.km - b.km)
    .map((row) => row.venue);
}
