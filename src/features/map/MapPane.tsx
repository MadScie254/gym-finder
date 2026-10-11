import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Venue } from "../../data/types";

const STYLE = "https://tiles.openfreemap.org/styles/liberty";

const TIER_COLOR: Record<string, string> = {
  verified: "#0A7A4B",
  corroborated: "#1F5FBF",
  listed: "#5B6560",
  unconfirmed: "#8F5200",
};

export function MapPane({ venues, selectedId }: { venues: Venue[]; selectedId: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: STYLE,
      center: [36.82, -1.29],
      zoom: 11,
      attributionControl: true,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      map.addSource("venues", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
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
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 },
        paint: { "text-color": "#ffffff" },
      });
      map.addLayer({
        id: "pins",
        type: "circle",
        source: "venues",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["match", ["get", "tier"], "verified", TIER_COLOR.verified, "corroborated", TIER_COLOR.corroborated, "unconfirmed", TIER_COLOR.unconfirmed, TIER_COLOR.listed],
          "circle-radius": ["case", ["==", ["get", "id"], selectedId ?? ""], 10, 6],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.on("click", "pins", (event) => {
        const slug = event.features?.[0]?.properties?.slug;
        if (typeof slug === "string") navigate(`/gym/${slug}`);
      });
      map.on("click", "clusters", (event) => {
        const feature = event.features?.[0];
        const source = map.getSource("venues") as maplibregl.GeoJSONSource;
        const id = feature?.properties?.cluster_id;
        if (id == null) return;
        source.getClusterExpansionZoom(id).then((zoom) => {
          const geometry = feature?.geometry;
          if (geometry?.type === "Point") map.easeTo({ center: geometry.coordinates as [number, number], zoom });
        });
      });
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [navigate, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource("venues") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData({
      type: "FeatureCollection",
      features: venues.map((venue) => ({
        type: "Feature",
        properties: { id: venue.id, slug: venue.slug, name: venue.name, tier: venue.trust.tier },
        geometry: { type: "Point", coordinates: [venue.lng, venue.lat] },
      })),
    });
  }, [venues]);

  return <div ref={ref} className="map-pane" role="region" aria-label="Map of gyms" />;
}
