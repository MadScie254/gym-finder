import { isInKenya, KENYA_BOUNDS } from "./kenya";
import { fetchWithTimeout } from "./requestSafety";
import { withCircuitBreaker, withProviderThrottle, withTtlCache } from "./ttlCache";
import type { Gym, LatLng } from "./types";

const DEFAULT_OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const configuredOverpass = process.env.OVERPASS_ENDPOINTS?.split(",");
const OVERPASS_ENDPOINTS = (
  configuredOverpass ??
  (process.env.NODE_ENV === "production" ? [] : DEFAULT_OVERPASS_ENDPOINTS)
)
  .map((endpoint) => endpoint.trim())
  .filter((endpoint) => endpoint.startsWith("https://"));
const PUBLIC_NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const configuredNominatim = process.env.NOMINATIM_URL?.trim();
const NOMINATIM_URL =
  (configuredNominatim?.startsWith("https://") ? configuredNominatim : null) ??
  (process.env.NODE_ENV === "production" ? null : PUBLIC_NOMINATIM_URL);
const USER_AGENT =
  process.env.OSM_USER_AGENT ?? "KenyaGymFinder/1.0 (https://github.com/MadScie254/gym-finder)";

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

function placeFromHit(hit: NominatimHit): PlaceHit | null {
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const location = { lat, lng };
  if (!isInKenya(location)) return null;

  const kind = placeKind(hit);
  const cls = `${hit.class ?? ""}`.toLowerCase();
  const type = `${hit.type ?? ""}`.toLowerCase();
  const isUseful =
    cls === "place" ||
    cls === "boundary" ||
    /city|town|village|suburb|neighbourhood|neighborhood|county|hamlet|municipality|administrative/.test(
      type,
    );
  if (!isUseful) return null;

  const { name, subtitle } = placeLabel(hit);
  return {
    id: hit.osm_id && hit.osm_type ? `${hit.osm_type}/${hit.osm_id}` : `${name}|${lat}|${lng}`,
    name,
    subtitle,
    kind,
    location,
  };
}

async function nominatimSearch(query: string, limit: number): Promise<NominatimHit[]> {
  if (!NOMINATIM_URL) {
    throw new Error("Place search is unavailable until a production geocoder is configured");
  }
  const normalized = query.trim().toLowerCase();
  return withTtlCache(`nominatim:${normalized}:${limit}`, 24 * 60 * 60 * 1_000, () =>
    withCircuitBreaker("nominatim", () =>
      withProviderThrottle("nominatim", 1_100, async () => {
        const params = new URLSearchParams({
          format: "jsonv2",
          countrycodes: "ke",
          limit: String(limit),
          addressdetails: "1",
          namedetails: "1",
          extratags: "1",
          q: `${query.trim()}, Kenya`,
          viewbox: `${KENYA_BOUNDS.west},${KENYA_BOUNDS.north},${KENYA_BOUNDS.east},${KENYA_BOUNDS.south}`,
        });
        const response = await fetchWithTimeout(`${NOMINATIM_URL}?${params.toString()}`, {
          headers: headers(),
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`Geocode failed (${response.status})`);
        return (await response.json()) as NominatimHit[];
      }),
    ),
  );
}

export async function geocodeKenyaPlaces(query: string, limit = 8): Promise<PlaceHit[]> {
  const key = `geocode:${query.trim().toLowerCase()}:${limit}`;
  return withTtlCache(key, 24 * 60 * 60 * 1_000, () => geocodeKenyaPlacesUncached(query, limit));
}

async function geocodeKenyaPlacesUncached(query: string, limit: number): Promise<PlaceHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const hits = await nominatimSearch(trimmed, limit);
  const places: PlaceHit[] = [];
  const seen = new Set<string>();

  for (const hit of hits) {
    const place = placeFromHit(hit);
    if (!place) continue;
    const key = `${place.name.toLowerCase()}|${place.location.lat.toFixed(3)}|${place.location.lng.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    places.push(place);
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
  return null;
}

function typesFrom(tags: Record<string, string> = {}): string[] {
  return [tags.leisure, tags.amenity, tags.sport, tags.fitness_station]
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
  for (const [index, endpoint] of OVERPASS_ENDPOINTS.entries()) {
    try {
      return await withCircuitBreaker(`overpass:${endpoint}`, async () => {
        const response = await fetchWithTimeout(endpoint, {
          method: "POST",
          headers: { ...headers(), "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body: `data=${encodeURIComponent(query)}`,
          cache: "no-store",
        }, 8_000);
        if (!response.ok) throw new Error(`Overpass failed (${response.status})`);
        const payload = (await response.json()) as { elements?: OsmElement[] };
        return payload.elements ?? [];
      });
    } catch {
      // Try the next provider once. Requests are intentionally sequential to
      // avoid doubling traffic to community-operated Overpass services.
      if (index < OVERPASS_ENDPOINTS.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** index));
      }
    }
  }
  throw new Error(
    OVERPASS_ENDPOINTS.length
      ? "Gym data provider is temporarily unavailable"
      : "Gym data is unavailable until a production provider is configured",
  );
}

export async function searchNearbyGyms(center: LatLng, radiusMeters: number): Promise<Gym[]> {
  const radius = Math.min(Math.max(radiusMeters, 400), 40_000);
  const key = `nearby:${center.lat.toFixed(4)}:${center.lng.toFixed(4)}:${radius}`;
  return withTtlCache(key, 5 * 60 * 1_000, () => searchNearbyGymsUncached(center, radius));
}

async function searchNearbyGymsUncached(center: LatLng, radius: number): Promise<Gym[]> {
  const filter = `(around:${radius},${center.lat},${center.lng})`;
  const query = `[out:json][timeout:8];(${gymQuery(filter)});out center tags 40;`;
  const elements = await overpass(query);
  const gyms = elements.map(mapElement).filter((gym): gym is Gym => gym != null);
  const unique = new Map<string, Gym>();
  for (const gym of gyms) unique.set(gym.id, gym);
  return [...unique.values()];
}

export async function searchTextGyms(query: string, center?: LatLng): Promise<Gym[]> {
  // One Nominatim request can resolve a town, estate, or mapped fitness venue.
  // Keeping this to one request avoids bursting a public geocoding provider.
  const hits = await nominatimSearch(query, 12);
  const place = hits.map(placeFromHit).find((candidate): candidate is PlaceHit => candidate != null);
  if (place) {
    return searchNearbyGyms(place.location, 15000);
  }
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
  return withTtlCache(`details:${id}`, 60 * 60 * 1_000, () => getPlaceDetailsUncached(id));
}

async function getPlaceDetailsUncached(id: string): Promise<Gym | null> {
  const parsed = parseId(id);
  if (!parsed) return null;
  const query = `[out:json][timeout:15];${parsed.type}(${parsed.id});out center tags;`;
  const elements = await overpass(query);
  return elements[0] ? mapElement(elements[0]) : null;
}
