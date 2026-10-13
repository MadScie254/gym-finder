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
