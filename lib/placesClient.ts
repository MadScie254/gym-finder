import type { Gym, LatLng } from "./types";

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
  warning?: string;
}> {
  const params = new URLSearchParams({
    lat: String(center.lat),
    lng: String(center.lng),
    radius: String(radiusMeters),
  });
  const response = await fetch(`/api/places/nearby?${params.toString()}`);
  const payload = (await response.json()) as { gyms?: Gym[]; error?: string; warning?: string };
  if (!response.ok) {
    throw new Error(payload.error || (await readError(response)));
  }
  return { gyms: payload.gyms ?? [], warning: payload.warning };
}

export async function fetchSearchGyms(query: string): Promise<{
  gyms: Gym[];
  warning?: string;
}> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`/api/places/search?${params.toString()}`);
  const payload = (await response.json()) as { gyms?: Gym[]; error?: string; warning?: string };
  if (!response.ok) {
    throw new Error(payload.error || (await readError(response)));
  }
  return { gyms: payload.gyms ?? [], warning: payload.warning };
}

export async function fetchGymDetails(id: string): Promise<Gym> {
  const response = await fetch(`/api/places/details?id=${encodeURIComponent(id)}`);
  const payload = (await response.json()) as { gym?: Gym; error?: string };
  if (!response.ok || !payload.gym) {
    throw new Error(payload.error || "Could not load gym details");
  }
  return payload.gym;
}
