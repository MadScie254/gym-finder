"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, NavigationControl, type StyleSpecification } from "maplibre-gl";
import { KENYA_MAP_BOUNDS } from "@/lib/kenya";
import { clampPadding, shouldFallbackOnError, type MapPadding } from "@/lib/mapView";
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

const MAX_BOUNDS: [[number, number], [number, number]] = [
  [KENYA_MAP_BOUNDS.west, KENYA_MAP_BOUNDS.south],
  [KENYA_MAP_BOUNDS.east, KENYA_MAP_BOUNDS.north],
];

function desktopPadding(): MapPadding {
  if (typeof window === "undefined") return { top: 24, right: 24, bottom: 24, left: 24 };
  if (window.matchMedia("(min-width: 1100px)").matches) {
    return { top: 88, right: 28, bottom: 28, left: 440 };
  }
  if (window.matchMedia("(min-width: 900px)").matches) {
    return { top: 88, right: 24, bottom: 24, left: 380 };
  }
  return { top: 24, right: 16, bottom: 220, left: 16 };
}

function safePadding(map: MapLibreMap): MapPadding {
  const container = map.getContainer();
  return clampPadding(desktopPadding(), container.clientWidth || 0, container.clientHeight || 0);
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
  const [ready, setReady] = useState(false);
  const [mapState, setMapState] = useState<"loading" | "live" | "fallback">("loading");

  useEffect(() => {
    onSelectRef.current = onSelect;
    onIdleRef.current = onIdleCenter;
  }, [onIdleCenter, onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let map: MapLibreMap;
    // State is scoped to this map instance (not a ref) so React StrictMode's
    // dev remount cannot leak a stale "already fell back" flag onto the real map.
    let mapErrors = 0;
    let hasRendered = false;
    let usedFallback = false;

    const showFallback = () => {
      // Only ever replace a map that has not yet drawn tiles. Once the basemap
      // is live, transient tile failures must leave gaps — never blank it out.
      if (hasRendered || usedFallback) return;
      usedFallback = true;
      setMapState("fallback");
      map.getCanvasContainer().style.visibility = "hidden";
    };

    const markRendered = () => {
      hasRendered = true;
    };

    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: STYLE,
        center: [origin.lng, origin.lat],
        zoom: 12.6,
        attributionControl: { compact: true },
        maxBounds: MAX_BOUNDS,
        minZoom: 5.4,
        fadeDuration: 0,
      });
    } catch {
      queueMicrotask(() => setMapState("fallback"));
      return;
    }
    // Guards in showFallback/markRendered make a late timer fire a no-op, so the
    // timer only needs clearing on unmount.
    const fallbackTimer = setTimeout(() => {
      if (!hasRendered && !map.areTilesLoaded()) showFallback();
    }, 7_000);
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    map.on("load", () => {
      map.setPadding(safePadding(map));
      setReady(true);
    });
    map.on("idle", () => {
      if (!map.areTilesLoaded()) return;
      markRendered();
      setMapState("live");
    });
    map.on("error", () => {
      mapErrors += 1;
      // Fall back only while the map has never rendered (e.g. tiles never
      // arrive on first load). After it is live, ignore tile errors so the
      // basemap cannot appear and then disappear.
      if (shouldFallbackOnError({ hasRendered, usedFallback, errorCount: mapErrors })) {
        showFallback();
      }
    });
    map.on("moveend", () => {
      const center = map.getCenter();
      onIdleRef.current({ lat: center.lat, lng: center.lng });
    });

    const onResize = () => {
      map.setPadding(safePadding(map));
      map.resize();
    };
    window.addEventListener("resize", onResize);

    mapRef.current = map;
    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      window.removeEventListener("resize", onResize);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.easeTo({ center: [origin.lng, origin.lat], duration: 650, padding: safePadding(map) });
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
        { padding: safePadding(map), maxZoom: 14.2, duration: 850 },
      );
    }

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [gyms, origin, selectedId, ready]);

  return (
    <div className="map-frame">
      {mapState === "fallback" && (
        // The image keeps the map visible on browsers where WebGL is disabled or blocked.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="map-failsafe" src={fallbackMapUrl(origin)} alt="Map fallback" />
      )}
      <div ref={containerRef} className="map-canvas" />
      <div className={`map-status map-status--${mapState}`} aria-live="polite">
        <span />
        {mapState === "live" ? "Live map" : mapState === "fallback" ? "Map ready" : "Loading map"}
      </div>
    </div>
  );
}
