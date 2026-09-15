import { isInKenya, KENYA_BOUNDS } from "./kenya";
import type { Gym, LatLng } from "./types";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "KenyaGymFinder/1.0 (https://github.com/MadScie254/gym-finder)";

type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type NominatimHit = {
  osm_type?: string;
  osm_id?: number;
  display_name?: string;
  lat?: string;
  lon?: string;
  class?: string;
  type?: string;
  namedetails?: { name?: string };
  extratags?: Record<string, string>;
  address?: Record<string, string>;
};

export type PlaceHit = {
  id: string;
  name: string;
  subtitle: string;
  kind: "county" | "town" | "suburb" | "area" | "place";
  location: LatLng;
};

function placeKind(hit: NominatimHit): PlaceHit["kind"] {
  const type = `${hit.type ?? ""}`.toLowerCase();
  const cls = `${hit.class ?? ""}`.toLowerCase();
  if (type === "county" || type === "state") return "county";
  if (type === "city" || type === "town" || type === "municipality") return "town";
  if (type === "suburb" || type === "neighbourhood" || type === "neighborhood" || type === "quarter") {
    return "suburb";
  }
  if (cls === "boundary" || type === "administrative") return "area";
  return "place";
}

function placeLabel(hit: NominatimHit): { name: string; subtitle: string } {
  const address = hit.address ?? {};
  const name =
    hit.namedetails?.name ||
    address.city ||
    address.town ||
    address.village ||
    address.suburb ||
    address.county ||
    address.state ||
    hit.display_name?.split(",")[0] ||
    "Kenya";
  const parts = [
    address.suburb,
    address.city || address.town || address.village,
    address.county || address.state,
  ].filter((part, index, list) => part && list.indexOf(part) === index && part !== name);
  return {
    name,
    subtitle: parts.slice(0, 2).join(" · ") || "Kenya",
  };
}

export async function geocodeKenyaPlaces(query: string, limit = 8): Promise<PlaceHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const params = new URLSearchParams({
    format: "jsonv2",
    countrycodes: "ke",
    limit: String(limit),
    addressdetails: "1",
    namedetails: "1",
    q: `${trimmed}, Kenya`,
    viewbox: `${KENYA_BOUNDS.west},${KENYA_BOUNDS.north},${KENYA_BOUNDS.east},${KENYA_BOUNDS.south}`,
  });

  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Geocode failed (${response.status})`);
  }

  const hits = (await response.json()) as NominatimHit[];
  const places: PlaceHit[] = [];
  const seen = new Set<string>();

  for (const hit of hits) {
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const location = { lat, lng };
    if (!isInKenya(location)) continue;

    const kind = placeKind(hit);
    const cls = `${hit.class ?? ""}`.toLowerCase();
    const type = `${hit.type ?? ""}`.toLowerCase();
    const isUseful =
      cls === "place" ||
      cls === "boundary" ||
      /city|town|village|suburb|neighbourhood|neighborhood|county|hamlet|municipality|administrative/.test(
        type,
      );
    if (!isUseful) continue;

    const { name, subtitle } = placeLabel(hit);
    const key = `${name.toLowerCase()}|${lat.toFixed(3)}|${lng.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    places.push({
      id: hit.osm_id && hit.osm_type ? `${hit.osm_type}/${hit.osm_id}` : key,
      name,
      subtitle,
      kind,
      location,
    });
  }

  return places;
}

export async function resolveKenyaPlace(query: string): Promise<PlaceHit | null> {
  const places = await geocodeKenyaPlaces(query, 5);
  return places[0] ?? null;
}

function headers(): HeadersInit {
  return { "User-Agent": USER_AGENT, Accept: "application/json" };
}

function osmId(element: { type: string; id: number }): string {
  return `${element.type}/${element.id}`;
}

function parseId(id: string): { type: string; id: number } | null {
  const match = id.match(/^(node|way|relation)\/(\d+)$/);
  if (!match) return null;
  return { type: match[1], id: Number(match[2]) };
}

function locationOf(element: OsmElement): LatLng | null {
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (lat == null || lon == null) return null;
  const location = { lat, lng: lon };
  return isInKenya(location) ? location : null;
}

function addressFrom(tags: Record<string, string> = {}, fallback = ""): string {
  return (
    tags["addr:full"] ||
    [tags["addr:housenumber"], tags["addr:street"], tags["addr:suburb"], tags["addr:city"], tags["addr:county"]]
      .filter(Boolean)
      .join(", ") ||
    fallback
  );
}

function priceFrom(tags: Record<string, string> = {}): string | null {
  const fee = (tags.fee || tags.charge || "").toLowerCase();
  if (fee === "no" || fee === "free") return "PRICE_LEVEL_FREE";
  if (fee === "yes") return "PRICE_LEVEL_MODERATE";
  return null;
}

function typesFrom(tags: Record<string, string> = {}): string[] {
  return [tags.leisure, tags.amenity, tags.sport, tags.fitness_station, tags.opening_hours]
    .filter(Boolean)
    .flatMap((value) => value.split(/[;,]/).map((part) => part.trim().toLowerCase()));
}

function openNowFrom(tags: Record<string, string> = {}): boolean | null {
  const hours = tags.opening_hours?.toLowerCase() ?? "";
  if (!hours) return null;
  if (hours.includes("24/7") || hours === "24/7") return true;
  return null;
}

function mapElement(element: OsmElement): Gym | null {
  const tags = element.tags ?? {};
  const location = locationOf(element);
  if (!location) return null;
  const name = tags.name || tags["name:en"] || "Fitness centre";
  return {
    id: osmId(element),
    name,
    address: addressFrom(tags, "Kenya"),
    location,
    rating: null,
    userRatingCount: 0,
    priceLevel: priceFrom(tags),
    openNow: openNowFrom(tags),
    types: typesFrom(tags),
    photoName: null,
    googleMapsUri: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    phone: tags.phone || tags["contact:phone"] || null,
    website: tags.website || tags["contact:website"] || null,
    weekdayHours: tags.opening_hours ? [tags.opening_hours] : [],
    reviews: [],
    editorialSummary:
      [tags.description, tags.sport, tags.leisure]
        .filter(Boolean)
        .map((value) => value.replaceAll("_", " "))
        .join(" · ") || null,
    distanceKm: null,
    score: 0,
    labels: [],
  };
}

function gymQuery(filter: string): string {
  return `
    nwr["leisure"="fitness_centre"]${filter};
    nwr["amenity"="gym"]${filter};
    nwr["leisure"="sports_centre"]["sport"~"fitness|gym|weights",i]${filter};
    nwr["sport"="fitness"]${filter};
  `;
}

async function overpass(query: string): Promise<OsmElement[]> {
  const attempts = OVERPASS_ENDPOINTS.map(async (endpoint) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: `data=${encodeURIComponent(query)}`,
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Overpass ${response.status}`);
      }
      const payload = (await response.json()) as { elements?: OsmElement[] };
      return payload.elements ?? [];
    } finally {
      clearTimeout(timer);
    }
  });

  try {
    return await Promise.any(attempts);
  } catch {
    throw new Error("Overpass unavailable");
  }
}

export async function searchNearbyGyms(center: LatLng, radiusMeters: number): Promise<Gym[]> {
  const radius = Math.min(Math.max(radiusMeters, 400), 40000);
  const filter = `(around:${radius},${center.lat},${center.lng})`;
  const query = `[out:json][timeout:8];(${gymQuery(filter)});out center tags 40;`;
  const elements = await overpass(query);
  const gyms = elements.map(mapElement).filter((gym): gym is Gym => gym != null);
  const unique = new Map<string, Gym>();
  for (const gym of gyms) unique.set(gym.id, gym);
  return [...unique.values()];
}

export async function searchTextGyms(query: string, center?: LatLng): Promise<Gym[]> {
  // Prefer resolving the place first (Webuye, Kilimani, etc.), then find nearby gyms.
  const place = await resolveKenyaPlace(query);
  if (place) {
    return searchNearbyGyms(place.location, 15000);
  }

  const params = new URLSearchParams({
    format: "jsonv2",
    countrycodes: "ke",
    limit: "12",
    addressdetails: "1",
    extratags: "1",
    q: `${query} Kenya`,
    viewbox: `${KENYA_BOUNDS.west},${KENYA_BOUNDS.north},${KENYA_BOUNDS.east},${KENYA_BOUNDS.south}`,
  });
  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Search failed (${response.status})`);
  }
  const hits = (await response.json()) as NominatimHit[];
  const fitnessHits = hits.filter((hit) => {
    const kind = `${hit.class} ${hit.type}`.toLowerCase();
    return /gym|fitness|sport|leisure/.test(kind) || /gym|fitness|yoga/.test(hit.display_name ?? "");
  });

  const fromNominatim: Gym[] = (fitnessHits.length ? fitnessHits : hits)
    .map((hit) => {
      const lat = Number(hit.lat);
      const lng = Number(hit.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const location = { lat, lng };
      if (!isInKenya(location) || hit.osm_id == null || !hit.osm_type) return null;
      const type = hit.osm_type === "node" ? "node" : hit.osm_type === "relation" ? "relation" : "way";
      return mapElement({
        type,
        id: hit.osm_id,
        lat,
        lon: lng,
        tags: {
          name: hit.namedetails?.name || hit.display_name?.split(",")[0] || query,
          ...(hit.extratags ?? {}),
        },
      });
    })
    .filter((gym): gym is Gym => gym != null);

  const searchCenter = center ?? fromNominatim[0]?.location;
  if (searchCenter) {
    const nearby = await searchNearbyGyms(searchCenter, 12000);
    const unique = new Map<string, Gym>();
    for (const gym of [...fromNominatim, ...nearby]) unique.set(gym.id, gym);
    return [...unique.values()];
  }
  return fromNominatim;
}

export async function getPlaceDetails(id: string): Promise<Gym | null> {
  const parsed = parseId(id);
  if (!parsed) return null;
  const query = `[out:json][timeout:15];${parsed.type}(${parsed.id});out center tags;`;
  const elements = await overpass(query);
  return elements[0] ? mapElement(elements[0]) : null;
}
