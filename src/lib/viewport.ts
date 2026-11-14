import type { LatLng } from "../data/types";

/** A map viewport in degrees. Kenya never crosses the antimeridian, so west < east always. */
export type Bounds = { west: number; south: number; east: number; north: number };

export function inBounds(bounds: Bounds, point: LatLng): boolean {
  return point.lng >= bounds.west && point.lng <= bounds.east
    && point.lat >= bounds.south && point.lat <= bounds.north;
}

/** Items inside the viewport, in their original order. No viewport means no filtering. */
export function filterToBounds<T extends LatLng>(items: readonly T[], bounds: Bounds | null): T[] {
  if (!bounds) return [...items];
  return items.filter((item) => inBounds(bounds, item));
}

/** The smallest box around the points, or null when there are none. */
export function boundsOf(points: readonly LatLng[]): Bounds | null {
  if (points.length === 0) return null;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const point of points) {
    west = Math.min(west, point.lng);
    east = Math.max(east, point.lng);
    south = Math.min(south, point.lat);
    north = Math.max(north, point.lat);
  }
  return { west, south, east, north };
}

/** True when two viewports are the same to about a metre, so a repeated moveend is ignored. */
export function sameBounds(a: Bounds | null, b: Bounds | null): boolean {
  if (!a || !b) return a === b;
  const close = (x: number, y: number) => Math.abs(x - y) < 1e-5;
  return close(a.west, b.west) && close(a.south, b.south) && close(a.east, b.east) && close(a.north, b.north);
}

/** "36.7000,-1.3500,36.9000,-1.2000" (west, south, east, north) for the URL. */
export function formatBounds(bounds: Bounds): string {
  return [bounds.west, bounds.south, bounds.east, bounds.north].map((n) => n.toFixed(4)).join(",");
}

export function parseBounds(value: string | null): Bounds | null {
  const parts = (value ?? "").split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [west, south, east, north] = parts;
  if (west >= east || south >= north || Math.abs(south) > 90 || Math.abs(north) > 90) return null;
  return { west, south, east, north };
}
