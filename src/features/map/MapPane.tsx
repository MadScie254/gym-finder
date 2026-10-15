import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Map as MapLibreMap, NavigationControl, type GeoJSONSource, type MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./maplibreWorker";
import type { Venue } from "../../data/types";

function toFeatures(venues: Venue[]) {
  return {
    type: "FeatureCollection" as const,
    features: venues.map((venue) => ({
      type: "Feature" as const,
      properties: { id: venue.id, slug: venue.slug, name: venue.name, tier: venue.trust.tier },
      geometry: { type: "Point" as const, coordinates: [venue.lng, venue.lat] },
    })),
  };
}

const STYLE = "https://tiles.openfreemap.org/styles/liberty";

const TIER_COLOR: Record<string, string> = {
  verified: "#0A7A4B",
  corroborated: "#1F5FBF",
  listed: "#5B6560",
  unconfirmed: "#8F5200",
};

export function MapPane({ venues, selectedId }: { venues: Venue[]; selectedId: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  // The source only exists after "load"; keep the latest props so the load handler can draw them.
  const venuesRef = useRef(venues);
  const selectedRef = useRef(selectedId);
  const navigate = useNavigate();

  useEffect(() => {
    venuesRef.current = venues;
    selectedRef.current = selectedId;
  }, [venues, selectedId]);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: ref.current,
      style: STYLE,
      center: [36.82, -1.29],
      zoom: 11,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      map.addSource("venues", {
        type: "geojson",
        data: toFeatures(venuesRef.current),
        cluster: true,
        clusterRadius: 48,
      });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "venues",
        filter: ["has", "point_count"],
        paint: { "circle-color": "#0E1411", "circle-radius": 18 },
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
          "circle-radius": ["case", ["==", ["get", "id"], selectedRef.current ?? ""], 10, 6],
          "circle-stroke-width": 2,
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
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [navigate]);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource("venues") as GeoJSONSource | undefined;
    if (!source) return;
    source.setData(toFeatures(venues));
  }, [venues]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("pins")) return;
    map.setPaintProperty("pins", "circle-radius", ["case", ["==", ["get", "id"], selectedId ?? ""], 10, 6]);
  }, [selectedId]);

  return <div ref={ref} className="map-pane" role="region" aria-label="Map of gyms" />;
}
