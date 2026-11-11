import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import type { LatLng, Venue } from "../../data/types";

const OpenMapPane = lazy(() => import("./MapPane").then(({ MapPane }) => ({ default: MapPane })));
const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;

type Pin = { marker: google.maps.marker.AdvancedMarkerElement; element: HTMLElement };

function focus(map: google.maps.Map, venues: Venue[], selectedId: string | null, origin: LatLng | null) {
  const selected = venues.find((venue) => venue.id === selectedId);
  const point = selected ?? origin;
  if (point) {
    map.panTo({ lat: point.lat, lng: point.lng });
    map.setZoom(selected ? 15 : 12);
  } else if (venues.length > 0 && venues.length <= 80) {
    const bounds = new google.maps.LatLngBounds();
    venues.forEach((venue) => bounds.extend({ lat: venue.lat, lng: venue.lng }));
    map.fitBounds(bounds, 56);
    google.maps.event.addListenerOnce(map, "idle", () => {
      if ((map.getZoom() ?? 0) > 13) map.setZoom(13);
    });
  }
}

export function MapPane({ venues, selectedId, origin = null }: { venues: Venue[]; selectedId: string | null; origin?: LatLng | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clusterRef = useRef<MarkerClusterer | null>(null);
  const pinsRef = useRef<Map<string, Pin>>(new Map());
  const current = useRef({ venues, selectedId, origin });
  current.current = { venues, selectedId, origin };
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!ref.current || !key || !mapId) return;
    let active = true;
    setOptions({ key, v: "weekly", region: "KE", language: "en", authReferrerPolicy: "origin" });
    Promise.all([importLibrary("maps"), importLibrary("marker")]).then(([{ Map }]) => {
      if (!active || !ref.current) return;
      mapRef.current = new Map(ref.current, {
        center: { lat: -1.286389, lng: 36.817223 },
        zoom: 11,
        mapId,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "greedy",
      });
      setReady(true);
    }).catch(() => { if (active) setFailed(true); });
    return () => {
      active = false;
      clusterRef.current?.clearMarkers();
      for (const { marker } of pinsRef.current.values()) marker.map = null;
      pinsRef.current.clear();
      if (mapRef.current) google.maps.event.clearInstanceListeners(mapRef.current);
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    clusterRef.current?.clearMarkers();
    for (const { marker } of pinsRef.current.values()) marker.map = null;
    pinsRef.current.clear();

    const markers = venues.map((venue) => {
      const element = document.createElement("div");
      element.className = `gym-map-pin gym-map-pin--${venue.trust.tier}`;
      element.textContent = "•";
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: venue.lat, lng: venue.lng },
        title: venue.name,
        content: element,
        gmpClickable: true,
      });
      marker.addListener("click", () => navigate(`/gym/${venue.slug}`));
      pinsRef.current.set(venue.id, { marker, element });
      return marker;
    });
    clusterRef.current = new MarkerClusterer({
      map,
      markers,
      renderer: {
        render({ count, position }) {
          const element = document.createElement("div");
          element.className = "gym-map-cluster";
          element.textContent = String(count);
          return new google.maps.marker.AdvancedMarkerElement({ position, content: element, zIndex: count });
        },
      },
    });
    focus(map, venues, current.current.selectedId, current.current.origin);
    return () => {
      clusterRef.current?.clearMarkers();
      clusterRef.current = null;
      for (const { marker } of pinsRef.current.values()) marker.map = null;
      pinsRef.current.clear();
    };
  }, [ready, venues, navigate]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    for (const [id, { element }] of pinsRef.current) {
      element.classList.toggle("gym-map-pin--selected", id === selectedId);
    }
    if (selectedId || origin) focus(mapRef.current, current.current.venues, selectedId, origin);
  }, [ready, selectedId, origin]);

  if (failed) {
    return <Suspense fallback={<p className="map-fallback">Loading map…</p>}>
      <OpenMapPane venues={venues} selectedId={selectedId} origin={origin} />
    </Suspense>;
  }
  return <div ref={ref} className="map-pane" role="region" aria-label="Map of gyms" />;
}
