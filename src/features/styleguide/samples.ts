import type { TrustTier } from "../../data/types";
import { haversineKm, NAIROBI } from "../../lib/kenya";

/**
 * Real rows copied from public/data/gyms.2559cc2dc7.json (built 2026-11-05).
 * Distances are straight-line from central Nairobi, the app's default origin.
 * No catalogue gym has hours or a Verified tier yet, so the styleguide never
 * pairs "Open now" or "Verified" with a real gym name.
 */
export type SampleGym = {
  name: string;
  slug: string;
  place: string;
  tier: TrustTier;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
};

export const SAMPLE_GYMS: SampleGym[] = [
  { name: "Salute Gym", slug: "salute-gym-179a", place: "Umoja 2, Nairobi", tier: "corroborated", lat: -1.285353, lng: 36.900715, phone: "+254769700300", website: "https://salute-gym.business.site/" },
  { name: "Lystra Gym And Spa", slug: "lystra-gym-and-spa-4e03", place: "Buru Buru 5, Nairobi", tier: "corroborated", lat: -1.294241, lng: 36.875759, phone: "+254717309319", website: "http://www.lystragym.com/" },
  { name: "Hot Sports Gym", slug: "hot-sports-gym-1b7b", place: "Bungoma", tier: "listed", lat: 0.559636, lng: 34.562386, phone: null, website: null },
  { name: "Ogwang Lion Gym", slug: "ogwang-lion-gym-71c0", place: "Manyatta A, Kisumu", tier: "unconfirmed", lat: -0.095888, lng: 34.773056, phone: "+254713538069", website: null },
  { name: "GymHouse & Spa", slug: "gymhouse-spa-2a97", place: "Embakasi Village, Nairobi", tier: "corroborated", lat: -1.308223, lng: 36.908798, phone: "+254715652568", website: "https://gymhouse-spa.business.site/" },
];

export function kmFromCentre(gym: SampleGym): number {
  return haversineKm(NAIROBI, { lat: gym.lat, lng: gym.lng });
}

export const SAMPLE_PLACES = [
  { id: "umoja", label: "Umoja", hint: "Estate, Nairobi" },
  { id: "kisumu", label: "Kisumu", hint: "City, Kisumu County" },
];
