import type { VenueKind } from "../data/types";

export const KIND_FILTERS: readonly VenueKind[] = ["gym", "martial_arts", "yoga", "boot_camp", "boxing", "crossfit", "gymnastics", "pilates"];
export const DISTANCE_FILTERS = [2, 5, 10] as const;
export type DistanceFilter = (typeof DISTANCE_FILTERS)[number];
export type TrustFilter = "any" | "strong" | "verified";
export type SortOrder = "distance" | "trust";

/** Everything the list and map filter on. It lives in the URL so reload, back and share restore it. */
export type Filters = {
  q: string;
  kind: VenueKind | null;
  km: DistanceFilter | null;
  trust: TrustFilter;
  phone: boolean;
  open: boolean;
  /** Null means the default: nearest first when there is a reference point, else most trusted. */
  sort: SortOrder | null;
};

export const NO_FILTERS: Filters = { q: "", kind: null, km: null, trust: "any", phone: false, open: false, sort: null };

const KEYS = ["q", "kind", "km", "trust", "phone", "open", "sort"] as const;

export function parseFilters(params: URLSearchParams): Filters {
  const kind = params.get("kind");
  const km = Number(params.get("km"));
  const trust = params.get("trust");
  const sort = params.get("sort");
  return {
    q: (params.get("q") ?? "").slice(0, 120),
    kind: KIND_FILTERS.includes(kind as VenueKind) ? (kind as VenueKind) : null,
    km: DISTANCE_FILTERS.includes(km as DistanceFilter) ? (km as DistanceFilter) : null,
    trust: trust === "strong" || trust === "verified" ? trust : "any",
    phone: params.get("phone") === "1",
    open: params.get("open") === "1",
    sort: sort === "distance" || sort === "trust" ? sort : null,
  };
}

/**
 * Write filters into a copy of `params`, keeping unrelated keys (such as `ids`).
 * Defaults are left out so a plain list has a plain URL.
 */
export function writeFilters(filters: Filters, params: URLSearchParams = new URLSearchParams()): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const key of KEYS) next.delete(key);
  if (filters.q.trim()) next.set("q", filters.q.trim());
  if (filters.kind) next.set("kind", filters.kind);
  if (filters.km) next.set("km", String(filters.km));
  if (filters.trust !== "any") next.set("trust", filters.trust);
  if (filters.phone) next.set("phone", "1");
  if (filters.open) next.set("open", "1");
  if (filters.sort) next.set("sort", filters.sort);
  return next;
}

/** How many filters narrow the list (search text and sort order do not count). */
export function activeFilterCount(filters: Filters): number {
  return [filters.kind, filters.km, filters.trust !== "any", filters.phone, filters.open].filter(Boolean).length;
}

/** Search params as a string with a leading "?", or "" when empty. */
export function queryString(params: URLSearchParams): string {
  const text = params.toString();
  return text ? `?${text}` : "";
}
