import { searchVenues, type VenueIndex } from "../data/loadVenues";
import type { LatLng, Venue } from "../data/types";
import { foldPlace, venuesInPlace } from "./filterVenues";
import { parseHours } from "./hours";
import { haversineKm } from "./kenya";
import { gymsNear, NEAR_KM, type Landmark } from "./landmarks";
import type { Filters, SortOrder } from "./urlState";

/** Which slice of the catalogue a page shows, before filters. */
export type Scope =
  | { kind: "all" }
  | { kind: "place"; name: string; point: LatLng | null }
  | { kind: "county"; name: string }
  | { kind: "landmark"; landmark: Landmark };

export type Results = {
  /** The scope after search text, before chips: the base every chip count is measured on. */
  base: Venue[];
  /** Filtered and sorted. */
  list: Venue[];
  /** Distances are measured from here: the landmark on a "near" page, else the visitor. */
  reference: LatLng | null;
  sort: SortOrder;
};

function isHidden(venue: Venue, filters: Filters): boolean {
  return venue.trust.tier === "unconfirmed" && !filters.q.trim();
}

export function scopeVenues(index: VenueIndex, scope: Scope, filters: Filters): Venue[] {
  const q = filters.q.trim();
  let base: Venue[];
  if (scope.kind === "place") base = venuesInPlace(index.venues, scope.name, scope.point);
  else if (scope.kind === "county") {
    const needle = foldPlace(scope.name);
    base = index.venues.filter((venue) => venue.county && foldPlace(venue.county) === needle);
  } else if (scope.kind === "landmark") base = gymsNear(index.venues, scope.landmark, NEAR_KM);
  else base = q ? searchVenues(index, q, true) : index.venues;
  if (q && scope.kind !== "all") {
    const hits = new Set(searchVenues(index, q, true).map((venue) => venue.id));
    base = base.filter((venue) => hits.has(venue.id));
  }
  return base.filter((venue) => !isHidden(venue, filters));
}

export function matchesFilters(venue: Venue, filters: Filters, reference: LatLng | null, now = new Date()): boolean {
  if (filters.kind && venue.kind !== filters.kind) return false;
  if (filters.phone && venue.phones.length === 0 && !venue.whatsapp) return false;
  if (filters.trust === "strong" && venue.trust.tier !== "verified" && venue.trust.tier !== "corroborated") return false;
  if (filters.trust === "verified" && venue.trust.tier !== "verified") return false;
  if (filters.open && parseHours(venue.hours?.raw, now).state !== "open") return false;
  if (filters.km && reference && haversineKm(reference, venue) > filters.km) return false;
  return true;
}

export function effectiveSort(filters: Filters, reference: LatLng | null): SortOrder {
  if (!reference) return "trust";
  return filters.sort ?? "distance";
}

export function sortList(venues: Venue[], sort: SortOrder, reference: LatLng | null): Venue[] {
  const km = new Map(reference ? venues.map((venue) => [venue.id, haversineKm(reference, venue)]) : []);
  return [...venues].sort((a, b) => {
    if (sort === "distance" && reference) {
      const delta = (km.get(a.id) ?? 0) - (km.get(b.id) ?? 0);
      if (delta !== 0) return delta;
    }
    return b.trust.score - a.trust.score || a.name.localeCompare(b.name);
  });
}

export function computeResults(index: VenueIndex, scope: Scope, filters: Filters, origin: LatLng | null, now = new Date()): Results {
  const reference = scope.kind === "landmark" ? scope.landmark : origin;
  const base = scopeVenues(index, scope, filters);
  const sort = effectiveSort(filters, reference);
  // A text search keeps its relevance order unless the visitor picks a sort.
  const keepOrder = filters.q.trim() && !filters.sort && scope.kind === "all";
  const filtered = base.filter((venue) => matchesFilters(venue, filters, reference, now));
  return { base, list: keepOrder ? filtered : sortList(filtered, sort, reference), reference, sort };
}

/** How many gyms the list would hold with `patch` applied: the live count on a chip. */
export function countWith(base: readonly Venue[], filters: Filters, patch: Partial<Filters>, reference: LatLng | null, now = new Date()): number {
  const next = { ...filters, ...patch };
  let total = 0;
  for (const venue of base) if (matchesFilters(venue, next, reference, now)) total += 1;
  return total;
}
