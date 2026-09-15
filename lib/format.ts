import type { Budget, GymLabel } from "./types";

export function formatDistance(km: number | null): string {
  if (km == null) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export function formatPrice(level: string | null): string | null {
  const labels: Record<string, string> = {
    PRICE_LEVEL_FREE: "Free",
    PRICE_LEVEL_INEXPENSIVE: "Budget",
    PRICE_LEVEL_MODERATE: "Mid-range",
    PRICE_LEVEL_EXPENSIVE: "Premium",
    PRICE_LEVEL_VERY_EXPENSIVE: "Luxury",
  };
  return level ? (labels[level] ?? null) : null;
}

export function formatBudget(budget: Budget): string {
  const labels: Record<Budget, string> = {
    any: "No fee preference",
    free: "Mapped as free",
  };
  return labels[budget];
}

export function labelText(label: GymLabel): string {
  if (label === "best_match") return "Best match";
  if (label === "closest") return "Closest";
  return "Top rated";
}

export function starText(rating: number | null, count: number): string {
  if (rating == null) return "OpenStreetMap";
  return `${rating.toFixed(1)} (${count})`;
}

export function directionsUrl(lat: number, lng: number, name: string): string {
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${lat}%2C${lng}#map=16/${lat}/${lng}&destination=${encodeURIComponent(name)}`;
}

export function safeExternalUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function safeTelephoneUrl(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.replace(/[\s().-]/g, "");
  return /^\+?[0-9]{6,20}$/.test(normalized) ? `tel:${normalized}` : null;
}
