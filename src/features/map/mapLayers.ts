import type { ExpressionSpecification, FilterSpecification, Map as MapLibreMap } from "maplibre-gl";
import type { LatLng, Venue } from "../../data/types";

/** Map paint cannot read CSS variables, so the Signwriter values are repeated here (see src/ui/tokens.css). */
const PLATE = "#1b2333";
const PLATE_EDGE = "#3a4357";
const COBALT = "#2346d8";
const CHALK = "#f2f4f7";
const WHITE = "#ffffff";
/** OpenFreeMap serves only its own font stacks; the MapLibre default 404s. */
const FONT_BOLD = ["Noto Sans Bold"];

export const PIN_RADIUS = 9;

type Feature = { type: "Feature"; properties: { id: string; slug: string; name: string }; geometry: { type: "Point"; coordinates: [number, number] } };
export type FeatureSet = { type: "FeatureCollection"; features: Feature[] };

export function toFeatures(venues: readonly Venue[]): FeatureSet {
  return {
    type: "FeatureCollection",
    features: venues.map((venue) => ({
      type: "Feature",
      properties: { id: venue.id, slug: venue.slug, name: venue.name },
      geometry: { type: "Point", coordinates: [venue.lng, venue.lat] },
    })),
  };
}

export function pointFeature(point: LatLng | null): FeatureSet {
  return { type: "FeatureCollection", features: point ? [{ type: "Feature", properties: { id: "you", slug: "", name: "" }, geometry: { type: "Point", coordinates: [point.lng, point.lat] } }] : [] };
}

const unclustered: FilterSpecification = ["!", ["has", "point_count"]];
const clustered: FilterSpecification = ["has", "point_count"];

/**
 * Pins are iron plates seen face-on: a plate-coloured ring with a chalk hub. A cluster is a stack of
 * plates (two offset discs behind the top one) carrying the count. The selected gym is a larger
 * cobalt plate with its name. Everything is a map layer, never a DOM marker.
 */
export function addGymLayers(map: MapLibreMap, initialRadius: number) {
  map.addSource("gyms", { type: "geojson", data: toFeatures([]), cluster: true, clusterRadius: 44, clusterMaxZoom: 14 });
  map.addSource("selected", { type: "geojson", data: toFeatures([]) });
  map.addSource("you", { type: "geojson", data: pointFeature(null) });

  const stackRadius: ExpressionSpecification = ["step", ["get", "point_count"], 15, 10, 18, 50, 22];
  for (const [id, dy] of [["cluster-stack-2", 7], ["cluster-stack-1", 3.5]] as const) {
    map.addLayer({
      id, type: "circle", source: "gyms", filter: clustered,
      paint: { "circle-color": PLATE_EDGE, "circle-radius": stackRadius, "circle-translate": [0, dy], "circle-stroke-color": WHITE, "circle-stroke-width": 1.5 },
    });
  }
  map.addLayer({
    id: "cluster-top", type: "circle", source: "gyms", filter: clustered,
    paint: { "circle-color": PLATE, "circle-radius": stackRadius, "circle-stroke-color": WHITE, "circle-stroke-width": 2 },
  });
  map.addLayer({
    id: "cluster-count", type: "symbol", source: "gyms", filter: clustered,
    layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 13, "text-font": FONT_BOLD, "text-allow-overlap": true },
    paint: { "text-color": CHALK },
  });
  map.addLayer({
    id: "pin-ring", type: "circle", source: "gyms", filter: unclustered,
    paint: { "circle-color": PLATE, "circle-radius": initialRadius, "circle-radius-transition": { duration: 420, delay: 0 }, "circle-stroke-color": WHITE, "circle-stroke-width": 2 },
  });
  map.addLayer({
    id: "pin-hub", type: "circle", source: "gyms", filter: unclustered,
    paint: { "circle-color": CHALK, "circle-radius": initialRadius === 0 ? 0 : 3, "circle-radius-transition": { duration: 420, delay: 0 } },
  });
  map.addLayer({
    id: "you-halo", type: "circle", source: "you",
    paint: { "circle-color": COBALT, "circle-opacity": 0.16, "circle-radius": 16 },
  });
  map.addLayer({
    id: "you-dot", type: "circle", source: "you",
    paint: { "circle-color": COBALT, "circle-radius": 6, "circle-stroke-color": WHITE, "circle-stroke-width": 3 },
  });
  map.addLayer({
    id: "selected-ring", type: "circle", source: "selected",
    paint: { "circle-color": COBALT, "circle-radius": 14, "circle-stroke-color": WHITE, "circle-stroke-width": 3 },
  });
  map.addLayer({
    id: "selected-hub", type: "circle", source: "selected",
    paint: { "circle-color": WHITE, "circle-radius": 4.5 },
  });
  map.addLayer({
    id: "selected-name", type: "symbol", source: "selected",
    layout: {
      "text-field": ["get", "name"], "text-font": FONT_BOLD, "text-size": 14, "text-anchor": "top", "text-offset": [0, 1.35],
      "text-max-width": 12, "text-allow-overlap": true, "text-ignore-placement": true,
    },
    paint: { "text-color": COBALT, "text-halo-color": WHITE, "text-halo-width": 2 },
  });
}

/** Grow the pins in once after the first data lands: the single page-load moment (plan 3.4). */
export function dropPinsIn(map: MapLibreMap) {
  map.setPaintProperty("pin-ring", "circle-radius", PIN_RADIUS);
  map.setPaintProperty("pin-hub", "circle-radius", 3);
}

export const CLICKABLE_LAYERS = ["pin-ring", "pin-hub", "cluster-top", "cluster-count"];
