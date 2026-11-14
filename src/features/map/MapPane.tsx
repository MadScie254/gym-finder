import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Map as MapLibreMap, NavigationControl, setWorkerUrl, type GeoJSONSource, type MapLayerMouseEvent, type PaddingOptions } from "maplibre-gl";
import maplibreWorker from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Camera, MapFocus } from "../../app/explore-context";
import { prefersReducedMotion } from "../../app/useMediaQuery";
import type { LatLng, Venue } from "../../data/types";
import { boundsOf, type Bounds } from "../../lib/viewport";
import { addGymLayers, CLICKABLE_LAYERS, dropPinsIn, pointFeature, PIN_RADIUS, toFeatures } from "./mapLayers";
import styles from "./MapPane.module.css";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const KENYA: Camera = { center: { lat: 0.2, lng: 37.9 }, zoom: 5.4 };
setWorkerUrl(maplibreWorker);

export type MapPaneProps = {
  venues: Venue[];
  selectedId: string | null;
  /** The visitor's real position, drawn as a dot. Never a stand-in like central Nairobi. */
  origin?: LatLng | null;
  focus?: MapFocus | null;
  padding?: PaddingOptions;
  /** Start here instead of the whole of Kenya, for example where the visitor left the map. */
  initialCamera?: Camera | null;
  onSelect?: (slug: string, id: string) => void;
  /** After the visitor pans or zooms; programmatic moves do not count. */
  onUserMove?: (bounds: Bounds) => void;
  /** After every move, so the camera can be restored. */
  onCamera?: (camera: Camera) => void;
  label?: string;
  failText?: string;
};

const NO_PADDING: PaddingOptions = { top: 48, bottom: 48, left: 48, right: 48 };

function duration() {
  return prefersReducedMotion() ? 0 : 650;
}

function apply(map: MapLibreMap, focus: MapFocus, padding: PaddingOptions) {
  if (focus.kind === "fly") {
    map.flyTo({ center: [focus.point.lng, focus.point.lat], zoom: focus.zoom, padding, duration: duration(), essential: true });
    return;
  }
  const box = boundsOf(focus.points);
  if (!box) return;
  if (box.east - box.west < 0.002 && box.north - box.south < 0.002) {
    map.flyTo({ center: [box.west, box.south], zoom: 14.5, padding, duration: duration(), essential: true });
    return;
  }
  map.fitBounds([[box.west, box.south], [box.east, box.north]], { padding, maxZoom: 14.5, duration: duration() });
}

/** MapLibre map of the current results. Loaded lazily: it is the one heavy chunk. */
export function MapPane(props: MapPaneProps) {
  const { venues, selectedId, origin = null, focus = null } = props;
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const ready = useRef(false);
  const applied = useRef(0);
  const latest = useRef({ ...props, navigate });
  latest.current = { ...props, navigate };
  const previous = useRef({ selectedId, origin });
  const [failed, setFailed] = useState(false);

  function sync(map: MapLibreMap) {
    const { venues: pins, selectedId: id, origin: here = null } = latest.current;
    const selected = pins.find((venue) => venue.id === id) ?? null;
    (map.getSource("venues") as GeoJSONSource | undefined)?.setData(toFeatures(selected ? pins.filter((venue) => venue.id !== id) : pins));
    (map.getSource("selected") as GeoJSONSource | undefined)?.setData(toFeatures(selected ? [selected] : []));
    (map.getSource("you") as GeoJSONSource | undefined)?.setData(pointFeature(here));
  }

  function flyToVenue(map: MapLibreMap, id: string | null) {
    const venue = latest.current.venues.find((item) => item.id === id);
    if (venue) map.flyTo({ center: [venue.lng, venue.lat], zoom: 15, padding: latest.current.padding ?? NO_PADDING, duration: duration(), essential: true });
  }

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const start = props.initialCamera ?? KENYA;
    let map: MapLibreMap;
    try {
      map = new MapLibreMap({ container: ref.current, style: MAP_STYLE, center: [start.center.lng, start.center.lat], zoom: start.zoom, attributionControl: { compact: true } });
    } catch {
      setFailed(true);
      return;
    }
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(ref.current);
    let userMoving = false;
    map.on("movestart", (event: { originalEvent?: unknown }) => { if (event.originalEvent) userMoving = true; });
    map.on("moveend", (event: { originalEvent?: unknown }) => {
      const center = map.getCenter();
      latest.current.onCamera?.({ center: { lat: center.lat, lng: center.lng }, zoom: map.getZoom() });
      if (!userMoving && !event.originalEvent) return;
      userMoving = false;
      const box = map.getBounds();
      latest.current.onUserMove?.({ west: box.getWest(), south: box.getSouth(), east: box.getEast(), north: box.getNorth() });
    });
    map.on("load", () => {
      const reduced = prefersReducedMotion();
      addGymLayers(map, reduced ? PIN_RADIUS : 0);
      ready.current = true;
      if (ref.current) ref.current.dataset.ready = "true";
      sync(map);
      if (!reduced) requestAnimationFrame(() => dropPinsIn(map));
      const { focus: pending, padding = NO_PADDING } = latest.current;
      if (pending && pending.key !== applied.current) { applied.current = pending.key; apply(map, pending, padding); }
      for (const layer of CLICKABLE_LAYERS) {
        map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
      }
      map.on("click", "pin-ring", (event: MapLayerMouseEvent) => {
        const properties = event.features?.[0]?.properties;
        if (typeof properties?.slug !== "string") return;
        const { onSelect, navigate: go } = latest.current;
        if (onSelect) onSelect(properties.slug, String(properties.id));
        else go(`/gym/${properties.slug}`);
      });
      map.on("click", "cluster-top", (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        const id = feature?.properties?.cluster_id;
        if (id == null || feature?.geometry.type !== "Point") return;
        const center = feature.geometry.coordinates as [number, number];
        (map.getSource("venues") as GeoJSONSource).getClusterExpansionZoom(id)
          .then((zoom) => map.easeTo({ center, zoom: zoom + 0.3, duration: prefersReducedMotion() ? 0 : 400 }))
          .catch(() => undefined);
      });
    });
    return () => { observer.disconnect(); map.remove(); mapRef.current = null; ready.current = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mapRef.current && ready.current) sync(mapRef.current);
  }, [venues, selectedId, origin]); // eslint-disable-line react-hooks/exhaustive-deps

  // A newly selected gym, or a newly shared location, moves the map. The values present at mount do not:
  // coming Back must keep the camera where the visitor left it.
  useEffect(() => {
    const map = mapRef.current;
    const before = previous.current;
    previous.current = { selectedId, origin };
    if (!map || !ready.current) return;
    if (selectedId && selectedId !== before.selectedId) flyToVenue(map, selectedId);
    else if (origin && !selectedId && (origin.lat !== before.origin?.lat || origin.lng !== before.origin?.lng)) {
      map.flyTo({ center: [origin.lng, origin.lat], zoom: 13, duration: duration(), essential: true });
    }
  }, [selectedId, origin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current || !focus || focus.key === applied.current) return;
    applied.current = focus.key;
    apply(map, focus, latest.current.padding ?? NO_PADDING);
  }, [focus]);

  if (failed) return <p className={styles.failed}>{props.failText ?? "The map could not start on this device. The list still works."}</p>;
  return <div ref={ref} className={`map-pane ${styles.map}`} role="region" aria-label={props.label ?? "Map of gyms"} data-testid="map" />;
}
