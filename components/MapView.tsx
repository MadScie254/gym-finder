"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, NavigationControl } from "maplibre-gl";
import type { Gym, LatLng } from "@/lib/types";

/** OpenFreeMap permits keyless commercial use; its style includes attribution. */
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

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
  const [ready, setReady] = useState(false);
  const [mapState, setMapState] = useState<"loading" | "live" | "fallback">("loading");

  useEffect(() => {
    onSelectRef.current = onSelect;
    onIdleRef.current = onIdleCenter;
  }, [onIdleCenter, onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let map: MapLibreMap;
    let mapErrors = 0;
    const showFallback = () => {
      setMapState("fallback");
    };
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: STYLE_URL,
        center: [origin.lng, origin.lat],
        zoom: 12.6,
        attributionControl: { compact: true },
        maxBounds: KENYA_BOUNDS,
        minZoom: 5.4,
        fadeDuration: 0,
      });
    } catch {
      queueMicrotask(() => setMapState("fallback"));
      return;
    }
    const fallbackTimer = setTimeout(() => {
      if (!map.areTilesLoaded()) showFallback();
    }, 7_000);
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    map.on("load", () => {
      map.setPadding(desktopPadding());
      setReady(true);
    });
    map.on("idle", () => {
      if (map.areTilesLoaded()) {
        clearTimeout(fallbackTimer);
        mapErrors = 0;
        setMapState("live");
      }
    });
    map.on("error", () => {
      mapErrors += 1;
      if (mapErrors >= 4) {
        clearTimeout(fallbackTimer);
        showFallback();
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
      clearTimeout(fallbackTimer);
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

    return () => {
      originMarkerRef.current?.remove();
      originMarkerRef.current = null;
    };
  }, [origin, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const drawMarkers = () => {
      markersRef.current.forEach((marker) => marker.remove());
      const bounds = map.getBounds();
      markersRef.current = gyms.flatMap((gym, index) => {
        if (!bounds.contains([gym.location.lng, gym.location.lat])) return [];
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
        return [new Marker({ element: el, anchor: "bottom" })
          .setLngLat([gym.location.lng, gym.location.lat])
          .addTo(map)];
      });
    };
    drawMarkers();
    map.on("moveend", drawMarkers);

    return () => {
      map.off("moveend", drawMarkers);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [gyms, selectedId, ready]);

  return (
    <div className={`map-frame map-frame--${mapState}`}>
      {mapState === "fallback" && (
        // The image keeps the map visible on browsers where WebGL is disabled or blocked.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="map-failsafe" src={fallbackMapUrl(origin)} alt="Map fallback" />
      )}
      <div ref={containerRef} className="map-canvas" />
      <div className={`map-status map-status--${mapState}`} aria-live="polite">
        <span />
        {mapState === "live" ? "Live map" : mapState === "fallback" ? "Static fallback" : "Loading map"}
      </div>
    </div>
  );
}
