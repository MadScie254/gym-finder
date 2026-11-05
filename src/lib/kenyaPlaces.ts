import gazetteer from "@data/kenya-places.json";
import { COUNTIES, haversineKm } from "./kenya";
import type { LatLng, PlaceHit } from "../data/types";

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase()
    .replace(/^gyms?\s+(?:near|in)\s+/, "")
    .replace(/\s+gyms?$/, "").trim();
}

function countyHits(query: string): PlaceHit[] {
  return COUNTIES.filter((county) => county.name.toLocaleLowerCase().includes(query))
    .map((county) => ({
      id: `county/${county.name}`,
      name: county.name,
      subtitle: "County · Kenya",
      kind: "county" as const,
      location: { lat: county.lat, lng: county.lng },
    }));
}

/** All suggestions are local; this never calls a public geocoder per keystroke. */
export function suggestKenyaPlaces(input: string, limit = 6): PlaceHit[] {
  const query = normalize(input);
  if (!query) return [];
  const counties = countyHits(query);
  const places = gazetteer.places
    .filter((place) => place.name.toLocaleLowerCase().includes(query))
    .map((place): PlaceHit => ({
      id: place.id,
      name: place.name,
      subtitle: `${place.kind === "town" ? "Town" : "Neighbourhood"} · Kenya`,
      kind: place.kind as "town" | "suburb",
      location: place.location,
    }));
  return [...counties, ...places]
    .sort((a, b) => {
      const rank = (place: PlaceHit) => place.name.toLocaleLowerCase() === query ? 0 :
        place.name.toLocaleLowerCase().startsWith(query) ? 1 : 2;
      return rank(a) - rank(b);
    })
    .slice(0, limit);
}

export function findLocalPlace(input: string): PlaceHit | null {
  const query = normalize(input);
  if (!query) return null;
  return suggestKenyaPlaces(query, 20).find((place) => place.name.toLocaleLowerCase() === query) ?? null;
}

const NEIGHBOURHOOD_KM = 2;

export function reverseLookup(point: LatLng): { area: string | null; town: string | null } {
  let town: { name: string; km: number } | null = null;
  let area: { name: string; km: number } | null = null;
  for (const place of gazetteer.places) {
    const km = haversineKm(point, place.location);
    if (place.kind === "town") {
      if (!town || km < town.km) town = { name: place.name, km };
    } else if (km <= NEIGHBOURHOOD_KM) {
      if (!area || km < area.km) area = { name: place.name, km };
    }
  }
  return { area: area?.name ?? null, town: town?.name ?? null };
}
