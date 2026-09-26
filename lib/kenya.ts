import type { County, LatLng } from "./types";
import boundary from "@/data/kenya-boundary.json";

export const NAIROBI: LatLng = { lat: -1.286389, lng: 36.817223 };

export const KENYA_BOUNDS = {
  north: 5.57,
  south: -4.9,
  west: 33.75,
  east: 41.91,
};

export const COUNTIES: County[] = [
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

export function isInKenya(point: LatLng): boolean {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return false;
  if (
    point.lat > KENYA_BOUNDS.north ||
    point.lat < KENYA_BOUNDS.south ||
    point.lng < KENYA_BOUNDS.west ||
    point.lng > KENYA_BOUNDS.east
  ) return false;

  // A bounding box includes large parts of Uganda, Tanzania and Somalia.
  // Check the simplified gbOpen Kenya multipolygon, including lake islands.
  return boundary.polygons.some((polygon) => {
    const inRing = (ring: number[][]) => {
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

export function findCounty(query: string): County | undefined {
  const needle = query.trim().toLowerCase();
  if (!needle) return undefined;
  return COUNTIES.find(
    (county) =>
      county.name.toLowerCase() === needle ||
      county.name.toLowerCase().includes(needle),
  );
}

export function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const radius = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(sine)));
}
