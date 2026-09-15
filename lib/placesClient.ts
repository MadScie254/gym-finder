import type { Gym, LatLng } from "./types";
import type { PlaceHit } from "./osmPlaces";

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || response.statusText;
  } catch {
    return response.statusText;
  }
}

export async function fetchNearbyGyms(center: LatLng, radiusMeters: number): Promise<{
  gyms: Gym[];
  demo: boolean;
}> {
  const params = new URLSearchParams({
    lat: String(center.lat),
    lng: String(center.lng),
    radius: String(radiusMeters),
  });
  const response = await fetch(`/api/places/nearby?${params.toString()}`);
  const payload = (await response.json()) as { gyms?: Gym[]; demo?: boolean; error?: string };
  if (!response.ok) {
    throw new Error(payload.error || (await readError(response)));
  }
  return { gyms: payload.gyms ?? [], demo: Boolean(payload.demo) };
}

export async function fetchSearchGyms(query: string, center?: LatLng): Promise<{
  gyms: Gym[];
  demo: boolean;
}> {
  const params = new URLSearchParams({ q: query });
  if (center) {
    params.set("lat", String(center.lat));
    params.set("lng", String(center.lng));
  }
  const response = await fetch(`/api/places/search?${params.toString()}`);
  const payload = (await response.json()) as { gyms?: Gym[]; demo?: boolean; error?: string };
  if (!response.ok) {
    throw new Error(payload.error || (await readError(response)));
  }
  return { gyms: payload.gyms ?? [], demo: Boolean(payload.demo) };
}

export async function fetchPlaceSuggestions(query: string): Promise<PlaceHit[]> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`/api/places/geocode?${params.toString()}`);
  const payload = (await response.json()) as { places?: PlaceHit[]; error?: string };
  if (!response.ok) {
    throw new Error(payload.error || (await readError(response)));
  }
  return payload.places ?? [];
}

export async function fetchGymDetails(id: string): Promise<Gym> {
  const response = await fetch(`/api/places/details?id=${encodeURIComponent(id)}`);
  const payload = (await response.json()) as { gym?: Gym; error?: string };
  if (!response.ok || !payload.gym) {
    throw new Error(payload.error || "Could not load gym details");
  }
  return payload.gym;
}
