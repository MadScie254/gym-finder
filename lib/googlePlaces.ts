import { isInKenya, KENYA_BOUNDS } from "./kenya";
import type { Gym, GymReview, LatLng } from "./types";

const NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";
const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

const LIST_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.currentOpeningHours.openNow",
  "places.types",
  "places.photos",
  "places.googleMapsUri",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.editorialSummary",
].join(",");

const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "priceLevel",
  "currentOpeningHours.openNow",
  "regularOpeningHours.weekdayDescriptions",
  "types",
  "photos",
  "googleMapsUri",
  "nationalPhoneNumber",
  "websiteUri",
  "editorialSummary",
  "reviews",
].join(",");

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  currentOpeningHours?: { openNow?: boolean };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  types?: string[];
  photos?: { name?: string }[];
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  editorialSummary?: { text?: string };
  reviews?: { rating?: number; text?: { text?: string } }[];
};

export function getServerKey(): string | undefined {
  return process.env.GOOGLE_MAPS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
}

function mapPlace(place: GooglePlace): Gym | null {
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  if (lat == null || lng == null || !place.id) return null;
  const location = { lat, lng };
  if (!isInKenya(location)) return null;

  const reviews: GymReview[] =
    place.reviews
      ?.map((review) => ({
        text: review.text?.text ?? "",
        rating: review.rating ?? null,
      }))
      .filter((review) => review.text) ?? [];

  return {
    id: place.id,
    name: place.displayName?.text ?? "Gym",
    address: place.formattedAddress ?? "",
    location,
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? 0,
    priceLevel: place.priceLevel ?? null,
    openNow: place.currentOpeningHours?.openNow ?? null,
    types: place.types ?? [],
    photoName: place.photos?.[0]?.name ?? null,
    googleMapsUri: place.googleMapsUri ?? null,
    phone: place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    weekdayHours: place.regularOpeningHours?.weekdayDescriptions ?? [],
    reviews,
    editorialSummary: place.editorialSummary?.text ?? null,
    distanceKm: null,
    score: 0,
    labels: [],
  };
}

async function placesFetch(url: string, init: RequestInit, fieldMask: string): Promise<Response> {
  const key = getServerKey();
  if (!key) {
    throw new Error("Missing Google Maps server key");
  }
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": fieldMask,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

export async function searchNearbyGyms(center: LatLng, radiusMeters: number): Promise<Gym[]> {
  const response = await placesFetch(
    NEARBY_URL,
    {
      method: "POST",
      body: JSON.stringify({
        includedTypes: ["gym"],
        maxResultCount: 20,
        rankPreference: "DISTANCE",
        locationRestriction: {
          circle: {
            center: { latitude: center.lat, longitude: center.lng },
            radius: Math.min(Math.max(radiusMeters, 500), 50000),
          },
        },
      }),
    },
    LIST_FIELD_MASK,
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Places nearby failed (${response.status})`);
  }

  const payload = (await response.json()) as { places?: GooglePlace[] };
  return (payload.places ?? []).map(mapPlace).filter((gym): gym is Gym => gym != null);
}

export async function searchTextGyms(query: string, center?: LatLng): Promise<Gym[]> {
  const body: Record<string, unknown> = {
    textQuery: query,
    includedType: "gym",
    maxResultCount: 20,
    locationRestriction: {
      rectangle: {
        low: { latitude: KENYA_BOUNDS.south, longitude: KENYA_BOUNDS.west },
        high: { latitude: KENYA_BOUNDS.north, longitude: KENYA_BOUNDS.east },
      },
    },
  };

  if (center) {
    delete body.locationRestriction;
    body.locationBias = {
      circle: {
        center: { latitude: center.lat, longitude: center.lng },
        radius: 30000,
      },
    };
  }

  const response = await placesFetch(
    SEARCH_URL,
    { method: "POST", body: JSON.stringify(body) },
    LIST_FIELD_MASK,
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Places search failed (${response.status})`);
  }

  const payload = (await response.json()) as { places?: GooglePlace[] };
  return (payload.places ?? []).map(mapPlace).filter((gym): gym is Gym => gym != null);
}

export async function getPlaceDetails(id: string): Promise<Gym | null> {
  const response = await placesFetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`,
    { method: "GET" },
    DETAILS_FIELD_MASK,
  );
  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Place details failed (${response.status})`);
  }
  const place = (await response.json()) as GooglePlace;
  return mapPlace(place);
}

export async function fetchPlacePhoto(name: string, maxHeightPx = 800): Promise<Response> {
  const key = getServerKey();
  if (!key) {
    throw new Error("Missing Google Maps server key");
  }
  const url = new URL(`https://places.googleapis.com/v1/${name}/media`);
  url.searchParams.set("maxHeightPx", String(maxHeightPx));
  url.searchParams.set("skipHttpRedirect", "true");
  return fetch(url, {
    headers: { "X-Goog-Api-Key": key },
    cache: "force-cache",
  });
}
