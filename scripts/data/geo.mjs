import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BOUNDARY = JSON.parse(readFileSync(path.join(ROOT, "data", "kenya-boundary.json"), "utf8"));
const PLACES = JSON.parse(readFileSync(path.join(ROOT, "data", "kenya-places.json"), "utf8"));

export const COUNTIES = [
  { name: "Nairobi", lat: -1.286389, lng: 36.817223 },
  { name: "Mombasa", lat: -4.0435, lng: 39.6682 },
  { name: "Kwale", lat: -4.1816, lng: 39.4521 },
  { name: "Kilifi", lat: -3.5107, lng: 39.9093 },
  { name: "Tana River", lat: -1.5274, lng: 39.7444 },
  { name: "Lamu", lat: -2.2717, lng: 40.902 },
  { name: "Taita-Taveta", lat: -3.3969, lng: 38.556 },
  { name: "Garissa", lat: -0.4532, lng: 39.6461 },
  { name: "Wajir", lat: 1.7471, lng: 40.0573 },
  { name: "Mandera", lat: 3.9366, lng: 41.867 },
  { name: "Marsabit", lat: 2.3345, lng: 37.9904 },
  { name: "Isiolo", lat: 0.3556, lng: 37.5833 },
  { name: "Meru", lat: 0.0463, lng: 37.6559 },
  { name: "Tharaka-Nithi", lat: -0.2964, lng: 37.6459 },
  { name: "Embu", lat: -0.531, lng: 37.457 },
  { name: "Kitui", lat: -1.367, lng: 38.0106 },
  { name: "Machakos", lat: -1.5177, lng: 37.2634 },
  { name: "Makueni", lat: -1.8039, lng: 37.6243 },
  { name: "Nyandarua", lat: -0.2295, lng: 36.495 },
  { name: "Nyeri", lat: -0.4167, lng: 36.95 },
  { name: "Kirinyaga", lat: -0.4989, lng: 37.2803 },
  { name: "Murang'a", lat: -0.721, lng: 37.1527 },
  { name: "Kiambu", lat: -1.1714, lng: 36.8356 },
  { name: "Turkana", lat: 3.1167, lng: 35.6 },
  { name: "West Pokot", lat: 1.2389, lng: 35.1119 },
  { name: "Samburu", lat: 1.0968, lng: 36.698 },
  { name: "Trans Nzoia", lat: 1.0167, lng: 35.0 },
  { name: "Uasin Gishu", lat: 0.5143, lng: 35.2698 },
  { name: "Elgeyo-Marakwet", lat: 0.8, lng: 35.4833 },
  { name: "Nandi", lat: 0.1883, lng: 35.1031 },
  { name: "Baringo", lat: 0.4667, lng: 35.9667 },
  { name: "Laikipia", lat: 0.0273, lng: 37.0693 },
  { name: "Nakuru", lat: -0.3031, lng: 36.08 },
  { name: "Narok", lat: -1.0833, lng: 35.8667 },
  { name: "Kajiado", lat: -1.85, lng: 36.7833 },
  { name: "Kericho", lat: -0.3676, lng: 35.2831 },
  { name: "Bomet", lat: -0.7813, lng: 35.3428 },
  { name: "Kakamega", lat: 0.2827, lng: 34.7519 },
  { name: "Vihiga", lat: 0.0781, lng: 34.7221 },
  { name: "Bungoma", lat: 0.5635, lng: 34.5606 },
  { name: "Busia", lat: 0.4608, lng: 34.1115 },
  { name: "Siaya", lat: 0.0607, lng: 34.2881 },
  { name: "Kisumu", lat: -0.0917, lng: 34.768 },
  { name: "Homa Bay", lat: -0.5273, lng: 34.4571 },
  { name: "Migori", lat: -1.0634, lng: 34.4731 },
  { name: "Kisii", lat: -0.6817, lng: 34.7667 },
  { name: "Nyamira", lat: -0.5667, lng: 34.9333 },
];

function haversineKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sine = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(sine)));
}

export function isInKenya(point) {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return false;
  if (point.lat > 5.57 || point.lat < -4.9 || point.lng < 33.75 || point.lng > 41.91) return false;
  return BOUNDARY.polygons.some((polygon) => {
    const inRing = (ring) => {
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if ((yi > point.lat) !== (yj > point.lat) &&
          point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    };
    return polygon.length > 0 && inRing(polygon[0]) && !polygon.slice(1).some(inRing);
  });
}

export function nearestCounty(point) {
  let best = COUNTIES[0];
  let bestKm = Number.POSITIVE_INFINITY;
  for (const county of COUNTIES) {
    const km = haversineKm(point, county);
    if (km < bestKm) {
      best = county;
      bestKm = km;
    }
  }
  return best;
}

const countyKey = (value) => `${value ?? ""}`.toLowerCase().replace(/\b(?:county|city|district)\b/g, "").replace(/[^a-z]/g, "");
const COUNTY_BY_KEY = new Map(COUNTIES.map((county) => [countyKey(county.name), county]));

/** A COUNTIES entry named by free text ("Nairobi", "Uasin Gishu County", "Taita Taveta"), or null. */
export function countyFromText(value) {
  return value ? COUNTY_BY_KEY.get(countyKey(value)) ?? null : null;
}

/**
 * A county hint is distrusted when its centroid is more than this much further from the
 * point than the nearest county's centroid (large counties have far-away centroids, so a
 * flat cut-off would either reject Kajiado's northern towns or accept Nairobi for Nakuru).
 */
const HINT_SLACK_KM = 75;

/**
 * County for a point. The nearest-centroid test misplaces the Nairobi/Kiambu and
 * Nairobi/Kajiado fringes (county centroids are not borders), so a source-provided
 * county (Overture `locality`/`region` is usually a county name) wins when it
 * names a county whose centroid is plausibly near (see HINT_SLACK_KM). Otherwise nearest centroid.
 * @returns {{ name: string, by: "hint" | "centroid" }}
 */
export function assignCounty(point, hints = []) {
  const nearest = nearestCounty(point);
  const limit = haversineKm(point, nearest) + HINT_SLACK_KM;
  for (const hint of hints) {
    const county = countyFromText(hint);
    if (county && haversineKm(point, county) <= limit) return { name: county.name, by: "hint" };
  }
  return { name: nearest.name, by: "centroid" };
}

/**
 * A record with no county of its own (OSM, which carries no addr:county here) takes the
 * county of the nearest record that does, when that one is within `radiusM`: Meta's county
 * names beat centroid distance on the Nairobi/Kiambu/Kajiado fringes. Returns new records.
 */
export function inferCounties(records, radiusM = 1500) {
  const anchors = records.filter((record) => record.countyBy === "hint" && !record.approxRadiusM);
  return records.map((record) => {
    if (record.countyBy !== "centroid" || record.approxRadiusM) return record;
    let best = null;
    let bestKm = radiusM / 1000;
    for (const anchor of anchors) {
      const km = haversineKm(record, anchor);
      if (km <= bestKm) {
        best = anchor;
        bestKm = km;
      }
    }
    return best && best.county !== record.county ? { ...record, county: best.county, countyBy: "neighbour" } : record;
  });
}

const TOWN_MAX_KM = 30;
const AREA_MAX_KM = 2;

/**
 * Neighbourhood = nearest `suburb` within ~2 km; town = nearest `town` within 30 km
 * (further away it would be a guess). Overture `locality` is never used as area.
 */
export function reverseLookup(point) {
  let town = null;
  let area = null;
  for (const place of PLACES.places) {
    const km = haversineKm(point, place.location);
    if (place.kind === "town") {
      if (km <= TOWN_MAX_KM && (!town || km < town.km)) town = { name: place.name, km };
    } else if (place.kind === "suburb" && km <= AREA_MAX_KM) {
      if (!area || km < area.km) area = { name: place.name, km };
    }
  }
  return { area: area?.name ?? null, town: town?.name ?? null };
}

/**
 * Town for a venue once its county is settled. Nairobi City County is one city, so every
 * venue in it is in town "Nairobi": on distance alone, GeoNames "towns" such as Imara Daima
 * Estate, or the Kiambu and Kajiado towns ringing the city (Ruiru, Ngong, Ongata Rongai),
 * would label Kasarani, Karen or Utawala gyms. Elsewhere: the nearest town within 30 km,
 * skipping a town named after a different county (a county seat lies in its own county).
 */
export function townFor(point, county) {
  if (county === "Nairobi") return "Nairobi";
  let best = null;
  for (const place of PLACES.places) {
    if (place.kind !== "town") continue;
    const seat = countyFromText(place.name);
    if (seat && seat.name !== county) continue;
    const km = haversineKm(point, place.location);
    if (km <= TOWN_MAX_KM && (!best || km < best.km)) best = { name: place.name, km };
  }
  return best?.name ?? null;
}

/** Centre of a named place (suburb preferred, else town), for approximate web-research locations. */
export function placeCentre(name, kind) {
  const key = `${name ?? ""}`.toLowerCase().trim();
  if (!key) return null;
  const matches = PLACES.places.filter((place) => place.name.toLowerCase() === key && (!kind || place.kind === kind));
  if (!matches.length) return null;
  const best = matches.sort((a, b) => (b.population ?? 0) - (a.population ?? 0) || a.id.localeCompare(b.id))[0];
  return { lat: best.location.lat, lng: best.location.lng, kind: best.kind, name: best.name };
}

export { haversineKm };
