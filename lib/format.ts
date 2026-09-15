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
    any: "Any price",
    free: "Free",
    low: "Budget",
    mid: "Mid-range",
    high: "Premium",
  };
  return labels[budget];
}

export function labelText(label: GymLabel): string {
  if (label === "best_match") return "Best match";
  if (label === "closest") return "Closest";
  return "Top rated";
}

export function starText(rating: number | null, count: number): string {
  if (rating == null) return "No rating yet";
  return `${rating.toFixed(1)} (${count})`;
}

export function directionsUrl(lat: number, lng: number, name: string): string {
  const query = encodeURIComponent(`${name} @${lat},${lng}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${query}`;
}
