import { haversineKm } from "./kenya";
import { parseHours } from "./hours";
import type { LatLng, Venue } from "../data/types";

export type VenueFilters = {
  q?: string;
  kind?: string;
  hasPhone?: boolean;
  tier?: string;
  womenOnly?: boolean;
  openNow?: boolean;
  origin?: LatLng | null;
  maxKm?: number | null;
};

export function applyVenueFilters(venues: Venue[], filters: VenueFilters): Venue[] {
  return venues.filter((venue) => {
    if (venue.trust.tier === "unconfirmed" && !filters.q) return false;
    if (filters.kind && venue.kind !== filters.kind) return false;
    if (filters.hasPhone && venue.phones.length === 0 && !venue.whatsapp) return false;
    if (filters.tier === "strong" && venue.trust.tier !== "verified" && venue.trust.tier !== "corroborated") return false;
    if (filters.womenOnly && !venue.amenities.women_only) return false;
    if (filters.openNow && parseHours(venue.hours?.raw).state !== "open") return false;
    if (filters.origin && filters.maxKm) {
      if (haversineKm(filters.origin, { lat: venue.lat, lng: venue.lng }) > filters.maxKm) return false;
    }
    return true;
  });
}

export function sortVenues(venues: Venue[], origin?: LatLng | null): Venue[] {
  return [...venues].sort((a, b) => {
    if (origin) {
      const da = haversineKm(origin, { lat: a.lat, lng: a.lng });
      const db = haversineKm(origin, { lat: b.lat, lng: b.lng });
      if (da !== db) return da - db;
    }
    return b.trust.score - a.trust.score;
  });
}

/** Fold a place name for comparison: case, accents, apostrophes and hyphens do not matter. */
export function foldPlace(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[-\s]+/g, " ")
    .trim();
}

/** True when some venue sits in a county, town or area with exactly this name. */
export function isKnownPlace(venues: Venue[], name: string): boolean {
  const needle = foldPlace(name);
  if (!needle) return false;
  return venues.some((venue) => [venue.county, venue.town, venue.area].some((field) => field && foldPlace(field) === needle));
}

/**
 * Venues in a named county, town or area. Place pages must filter by place, not fuzzy text:
 * a fuzzy search for "Kisumu" also matches "Kiambu". When no venue carries the name, fall back
 * to venues within `radiusKm` of the place's gazetteer location, nearest first.
 */
export function venuesInPlace(venues: Venue[], name: string, fallback?: LatLng | null, radiusKm = 10): Venue[] {
  const needle = foldPlace(name);
  if (!needle) return [];
  const exact = venues.filter((venue) => [venue.county, venue.town, venue.area].some((field) => field && foldPlace(field) === needle));
  if (exact.length > 0 || !fallback) return exact;
  return venues
    .map((venue) => ({ venue, km: haversineKm(fallback, { lat: venue.lat, lng: venue.lng }) }))
    .filter((row) => row.km <= radiusKm)
    .sort((a, b) => a.km - b.km)
    .map((row) => row.venue);
}
