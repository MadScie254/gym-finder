/** Padded box used as the interactive map's maxBounds. */
export const KENYA_MAP_BOUNDS = {
  west: 33.6,
  south: -5.05,
  east: 42.05,
  north: 5.7,
} as const;

export const KENYA_MAP_MAX_BOUNDS: [[number, number], [number, number]] = [
  [KENYA_MAP_BOUNDS.west, KENYA_MAP_BOUNDS.south],
  [KENYA_MAP_BOUNDS.east, KENYA_MAP_BOUNDS.north],
];

export function isInsideKenyaMapBounds(lat: number, lng: number): boolean {
  return (
    lat <= KENYA_MAP_BOUNDS.north &&
    lat >= KENYA_MAP_BOUNDS.south &&
    lng >= KENYA_MAP_BOUNDS.west &&
    lng <= KENYA_MAP_BOUNDS.east
  );
}
