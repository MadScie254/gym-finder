import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Map as MapLibreMap, NavigationControl, setWorkerUrl, type GeoJSONSource, type MapLayerMouseEvent } from "maplibre-gl";
import maplibreWorker from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LatLng, Venue } from "../../data/types";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
setWorkerUrl(maplibreWorker);

const TIER_COLOR: Record<string, string> = {
  verified: "#0a7a51",
  corroborated: "#2346d8",
  listed: "#5a6477",
  unconfirmed: "#5a6477",
};

function venueData(venues: Venue[]) {
  return {
    type: "FeatureCollection" as const,
    features: venues.map((venue) => ({
      type: "Feature" as const,
      properties: { id: venue.id, slug: venue.slug, name: venue.name, tier: venue.trust.tier },
      geometry: { type: "Point" as const, coordinates: [venue.lng, venue.lat] },
    })),
  };
}

function focusMap(map: MapLibreMap, venues: Venue[], selectedId: string | null, origin: LatLng | null) {
  const selected = venues.find((venue) => venue.id === selectedId);
  const point = selected ?? origin;
  if (point) map.flyTo({ center: [point.lng, point.lat], zoom: selected ? 14 : 12, essential: true });
}

export function MapPane({ venues, selectedId, origin = null }: { venues: Venue[]; selectedId: string | null; origin?: LatLng | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const latest = useRef({ venues, selectedId, origin });
  latest.current = { venues, selectedId, origin };
  const navigate = useNavigate();

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: ref.current,
      style: MAP_STYLE,
      center: [36.82, -1.29],
      zoom: 11,
      pixelRatio: 1,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    const resize = () => map.resize();
    const observer = new ResizeObserver(resize);
    observer.observe(ref.current);
    requestAnimationFrame(resize);
    map.on("load", () => {
      resize();
      map.addSource("venues", {
        type: "geojson",
        data: venueData(latest.current.venues),
        cluster: true,
        clusterRadius: 48,
      });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "venues",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#1b2333",
          "circle-radius": ["step", ["get", "point_count"], 21, 20, 25, 100, 29],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "venues",
        filter: ["has", "point_count"],
        // OpenFreeMap only hosts its own font stacks; the MapLibre default ("Open Sans Regular,Arial Unicode MS Regular") 404s.
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12, "text-font": ["Noto Sans Regular"] },
        paint: { "text-color": "#ffffff" },
      });
      map.addLayer({
        id: "pins",
        type: "circle",
        source: "venues",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["match", ["get", "tier"], "verified", TIER_COLOR.verified, "corroborated", TIER_COLOR.corroborated, "unconfirmed", TIER_COLOR.unconfirmed, TIER_COLOR.listed],
          "circle-radius": ["case", ["==", ["get", "id"], selectedId ?? ""], 12, 8],
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.on("click", "pins", (event: MapLayerMouseEvent) => {
        const slug = event.features?.[0]?.properties?.slug;
        if (typeof slug === "string") navigate(`/gym/${slug}`);
      });
      map.on("click", "clusters", (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        const source = map.getSource("venues") as GeoJSONSource;
        const id = feature?.properties?.cluster_id;
        if (id == null) return;
        source.getClusterExpansionZoom(id).then((zoom: number) => {
          const geometry = feature?.geometry;
          if (geometry?.type === "Point") map.easeTo({ center: geometry.coordinates as [number, number], zoom });
        });
      });
      if (ref.current) ref.current.dataset.ready = "true";
      focusMap(map, latest.current.venues, latest.current.selectedId, latest.current.origin);
    });
    mapRef.current = map;
    return () => { observer.disconnect(); map.remove(); mapRef.current = null; };
  }, [navigate]);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource("venues") as GeoJSONSource | undefined;
    if (!source) return;
    source.setData(venueData(venues));
  }, [venues]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("pins")) return;
    map.setPaintProperty("pins", "circle-radius", ["case", ["==", ["get", "id"], selectedId ?? ""], 12, 8]);
    focusMap(map, latest.current.venues, selectedId, origin);
  }, [selectedId, origin]);

  return <div ref={ref} className="map-pane" role="region" aria-label="Map of gyms" />;
}
