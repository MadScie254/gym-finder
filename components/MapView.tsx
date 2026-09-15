"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, NavigationControl, type StyleSpecification } from "maplibre-gl";
import type { Gym, LatLng } from "@/lib/types";

/** Crisp street basemap — must stay readable on desktop and mobile. */
const STYLE: StyleSpecification = {
  version: 8,
  name: "KAYA Streets",
  sources: {
    streets: {
      type: "raster",
      tiles: ["/api/map/tiles/{z}/{x}/{y}"],
      tileSize: 256,
      attribution: "© Esri © OpenStreetMap",
      maxzoom: 19,
    },
  },
  layers: [{ id: "streets", type: "raster", source: "streets" }],
};

const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  name: "KAYA HOT",
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap · HOT",
      maxzoom: 19,
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const KENYA_BOUNDS: [[number, number], [number, number]] = [
  [33.6, -5.05],
  [42.05, 5.7],
];

function desktopPadding() {
  if (typeof window === "undefined") return { top: 24, right: 24, bottom: 24, left: 24 };
  if (window.matchMedia("(min-width: 1100px)").matches) {
    return { top: 88, right: 28, bottom: 28, left: 440 };
  }
  if (window.matchMedia("(min-width: 900px)").matches) {
    return { top: 88, right: 24, bottom: 24, left: 380 };
  }
  return { top: 24, right: 16, bottom: 220, left: 16 };
}

function fallbackMapUrl(center: LatLng): string {
  const params = new URLSearchParams({
    lat: String(center.lat),
    lng: String(center.lng),
  });
  return `/api/map/static?${params}`;
}

type MapViewProps = {
  origin: LatLng;
  gyms: Gym[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onIdleCenter: (center: LatLng) => void;
};

export default function MapView({ origin, gyms, selectedId, onSelect, onIdleCenter }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const originMarkerRef = useRef<Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const onIdleRef = useRef(onIdleCenter);
  const usedFallback = useRef(false);
  const [ready, setReady] = useState(false);
  const [mapState, setMapState] = useState<"loading" | "live" | "fallback">("loading");

  useEffect(() => {
    onSelectRef.current = onSelect;
    onIdleRef.current = onIdleCenter;
  }, [onIdleCenter, onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: STYLE,
      center: [origin.lng, origin.lat],
      zoom: 12.6,
      attributionControl: { compact: true },
      maxBounds: KENYA_BOUNDS,
      minZoom: 5.4,
      fadeDuration: 0,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    map.on("load", () => {
      map.setPadding(desktopPadding());
      setReady(true);
    });
    map.on("idle", () => {
      if (map.areTilesLoaded()) setMapState("live");
    });
    map.on("error", () => {
      if (!usedFallback.current) {
        usedFallback.current = true;
        setMapState("fallback");
        map.setStyle(FALLBACK_STYLE);
      }
    });
    map.on("moveend", () => {
      const center = map.getCenter();
      onIdleRef.current({ lat: center.lat, lng: center.lng });
    });

    const onResize = () => {
      map.setPadding(desktopPadding());
      map.resize();
    };
    window.addEventListener("resize", onResize);

    mapRef.current = map;
    return () => {
      window.removeEventListener("resize", onResize);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.easeTo({ center: [origin.lng, origin.lat], duration: 650, padding: desktopPadding() });
  }, [origin, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    originMarkerRef.current?.remove();
    const you = document.createElement("div");
    you.className = "kaya-you";
    originMarkerRef.current = new Marker({ element: you })
      .setLngLat([origin.lng, origin.lat])
      .addTo(map);

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = gyms.map((gym, index) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `kaya-pin${gym.id === selectedId ? " is-active" : ""}`;
      el.setAttribute("aria-label", gym.name);
      const dot = document.createElement("span");
      dot.className = "kaya-pin__dot";
      const label = document.createElement("span");
      label.className = "kaya-pin__label";
      label.textContent = String(index + 1).padStart(2, "0");
      el.append(dot, label);
      el.addEventListener("click", () => onSelectRef.current(gym.id));
      return new Marker({ element: el, anchor: "bottom" })
        .setLngLat([gym.location.lng, gym.location.lat])
        .addTo(map);
    });

    if (gyms.length > 0) {
      const lngs = [origin.lng, ...gyms.map((g) => g.location.lng)];
      const lats = [origin.lat, ...gyms.map((g) => g.location.lat)];
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: desktopPadding(), maxZoom: 14.2, duration: 850 },
      );
    }

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [gyms, origin, selectedId, ready]);

  return (
    <div className="map-frame">
      {/* The image keeps the map visible on browsers where WebGL is disabled or blocked. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="map-failsafe"
        src={fallbackMapUrl(origin)}
        alt=""
        aria-hidden
        onLoad={() => setMapState((state) => (state === "loading" ? "fallback" : state))}
      />
      <div ref={containerRef} className="map-canvas" />
      <div className={`map-status map-status--${mapState}`} aria-live="polite">
        <span />
        {mapState === "live" ? "Live map" : mapState === "fallback" ? "Map ready" : "Loading map"}
      </div>
    </div>
  );
}
