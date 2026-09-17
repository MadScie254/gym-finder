import { isInKenya } from "./kenya";
import { fetchWithTimeout } from "./requestSafety";
import { withCircuitBreaker, withTtlCache } from "./ttlCache";
import type { Gym, LatLng } from "./types";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY?.trim() || "";

export function googlePlacesConfigured(): boolean {
  return API_KEY.length > 20;
}

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  types?: string[];
  regularOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] };
  editorialSummary?: { text?: string };
  priceLevel?: string;
};

function mapPlace(place: GooglePlace): Gym | null {
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  if (lat == null || lng == null || !place.id) return null;
  const location = { lat, lng };
  if (!isInKenya(location)) return null;

  return {
    id: `google/${place.id}`,
    name: place.displayName?.text || "Gym",
    address: place.formattedAddress || "Kenya",
    location,
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? 0,
    priceLevel: place.priceLevel ?? null,
    openNow: place.regularOpeningHours?.openNow ?? null,
    types: place.types ?? ["gym"],
    photoName: null,
    googleMapsUri: place.googleMapsUri ?? null,
    phone: place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    weekdayHours: place.regularOpeningHours?.weekdayDescriptions ?? [],
    reviews: [],
    editorialSummary: place.editorialSummary?.text ?? null,
    distanceKm: null,
    score: 0,
    labels: [],
  };
}

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.types",
  "places.regularOpeningHours",
  "places.editorialSummary",
  "places.priceLevel",
].join(",");

export async function googleNearbyGyms(center: LatLng, radiusMeters: number): Promise<Gym[]> {
  if (!googlePlacesConfigured()) return [];
  const radius = Math.min(Math.max(radiusMeters, 400), 50_000);
  const key = `google-nearby:${center.lat.toFixed(4)}:${center.lng.toFixed(4)}:${radius}`;
  return withTtlCache(key, 10 * 60 * 1_000, () =>
    withCircuitBreaker("google-places", async () => {
      const response = await fetchWithTimeout(
        "https://places.googleapis.com/v1/places:searchNearby",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": API_KEY,
            "X-Goog-FieldMask": FIELD_MASK,
          },
          body: JSON.stringify({
            includedTypes: ["gym"],
            maxResultCount: 20,
            rankPreference: "DISTANCE",
            locationRestriction: {
              circle: {
                center: { latitude: center.lat, longitude: center.lng },
                radius,
              },
            },
          }),
        },
        12_000,
      );
      if (!response.ok) {
        throw new Error(`Google Places nearby failed (${response.status})`);
      }
      const payload = (await response.json()) as { places?: GooglePlace[] };
      return (payload.places ?? [])
        .map(mapPlace)
        .filter((gym): gym is Gym => gym != null);
    }),
  );
}

export async function googleTextGyms(query: string, center?: LatLng): Promise<Gym[]> {
  if (!googlePlacesConfigured()) return [];
  const trimmed = query.trim();
  if (!trimmed) return [];
  const key = `google-text:${trimmed.toLowerCase()}:${center ? `${center.lat.toFixed(3)},${center.lng.toFixed(3)}` : "none"}`;
  return withTtlCache(key, 10 * 60 * 1_000, () =>
    withCircuitBreaker("google-places-text", async () => {
      const body: Record<string, unknown> = {
        textQuery: `${trimmed} gym Kenya`,
        includedType: "gym",
        maxResultCount: 20,
        languageCode: "en",
        regionCode: "KE",
      };
      if (center) {
        body.locationBias = {
          circle: {
            center: { latitude: center.lat, longitude: center.lng },
            radius: 40_000,
          },
        };
      }
      const response = await fetchWithTimeout(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": API_KEY,
            "X-Goog-FieldMask": FIELD_MASK,
          },
          body: JSON.stringify(body),
        },
        12_000,
      );
      if (!response.ok) {
        throw new Error(`Google Places text failed (${response.status})`);
      }
      const payload = (await response.json()) as { places?: GooglePlace[] };
      return (payload.places ?? [])
        .map(mapPlace)
        .filter((gym): gym is Gym => gym != null);
    }),
  );
}
