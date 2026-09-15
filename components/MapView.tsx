"use client";

import { useEffect, useRef } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { DARK_MAP_STYLES } from "@/lib/mapStyles";
import type { Gym, LatLng } from "@/lib/types";

type MapViewProps = {
  apiKey: string;
  origin: LatLng;
  gyms: Gym[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onIdleCenter: (center: LatLng) => void;
};

function MapController({
  origin,
  gyms,
  selectedId,
  onSelect,
  onIdleCenter,
}: Omit<MapViewProps, "apiKey">) {
  const map = useMap();
  const markersRef = useRef<google.maps.Marker[]>([]);
  const originMarkerRef = useRef<google.maps.Marker | null>(null);
  const lastOrigin = useRef(origin);

  useEffect(() => {
    if (!map) return;
    if (
      lastOrigin.current.lat !== origin.lat ||
      lastOrigin.current.lng !== origin.lng
    ) {
      map.panTo(origin);
      lastOrigin.current = origin;
    }
  }, [map, origin]);

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("idle", () => {
      const center = map.getCenter();
      if (center) onIdleCenter({ lat: center.lat(), lng: center.lng() });
    });
    return () => listener.remove();
  }, [map, onIdleCenter]);

  useEffect(() => {
    if (!map) return;

    originMarkerRef.current?.setMap(null);
    originMarkerRef.current = new google.maps.Marker({
      map,
      position: origin,
      title: "You",
      zIndex: 1000,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#38f29b",
        fillOpacity: 1,
        strokeColor: "#0b0f14",
        strokeWeight: 3,
      },
    });

    return () => originMarkerRef.current?.setMap(null);
  }, [map, origin]);

  useEffect(() => {
    if (!map) return;
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = gyms.map((gym) => {
      const selected = gym.id === selectedId;
      const marker = new google.maps.Marker({
        map,
        position: gym.location,
        title: gym.name,
        zIndex: selected ? 900 : 1,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: selected ? 12 : 9,
          fillColor: selected ? "#f4ff57" : "#38f29b",
          fillOpacity: 1,
          strokeColor: "#0b0f14",
          strokeWeight: 2,
        },
      });
      marker.addListener("click", () => onSelect(gym.id));
      return marker;
    });

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };
  }, [map, gyms, selectedId, onSelect]);

  return null;
}

export default function MapView({
  apiKey,
  origin,
  gyms,
  selectedId,
  onSelect,
  onIdleCenter,
}: MapViewProps) {
  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#10161e] px-8 text-center">
        <div>
          <p className="text-lg font-semibold text-white">Map preview</p>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            Add a Maps JavaScript API key to see gyms on a live Kenya map. Suggestions still
            work from the list below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={origin}
        defaultZoom={13}
        gestureHandling="greedy"
        disableDefaultUI
        styles={DARK_MAP_STYLES}
        style={{ width: "100%", height: "100%" }}
        reuseMaps
      >
        <MapController
          origin={origin}
          gyms={gyms}
          selectedId={selectedId}
          onSelect={onSelect}
          onIdleCenter={onIdleCenter}
        />
      </Map>
    </APIProvider>
  );
}
