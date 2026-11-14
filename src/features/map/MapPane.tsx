import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, NavigationControl, setWorkerUrl, type GeoJSONSource, type MapLayerMouseEvent, type PaddingOptions } from "maplibre-gl";
import maplibreWorker from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapFocus } from "../../app/explore-context";
import { prefersReducedMotion } from "../../app/useMediaQuery";
import type { LatLng, Venue } from "../../data/types";
import { boundsOf, type Bounds } from "../../lib/viewport";
import { addGymLayers, CLICKABLE_LAYERS, dropPinsIn, pointFeature, PIN_RADIUS, toFeatures } from "./mapLayers";
import styles from "./MapPane.module.css";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
setWorkerUrl(maplibreWorker);

export type MapPaneProps = {
  pins: Venue[];
  selected: Venue | null;
  origin: LatLng | null;
  focus: MapFocus | null;
  padding: PaddingOptions;
  onSelect: (slug: string) => void;
  /** Called after the visitor pans or zooms; programmatic moves do not count. */
  onUserMove: (bounds: Bounds) => void;
  label: string;
  failText: string;
};

function apply(map: MapLibreMap, focus: MapFocus, padding: PaddingOptions) {
  const duration = prefersReducedMotion() ? 0 : 650;
  if (focus.kind === "fly") {
    map.flyTo({ center: [focus.point.lng, focus.point.lat], zoom: Math.max(map.getZoom(), focus.zoom), padding, duration, essential: true });
    return;
  }
  const box = boundsOf(focus.points);
  if (!box) return;
  if (focus.points.length === 1 || (box.east - box.west < 0.002 && box.north - box.south < 0.002)) {
    map.flyTo({ center: [focus.points[0].lng, focus.points[0].lat], zoom: 14.5, padding, duration, essential: true });
    return;
  }
  map.fitBounds([[box.west, box.south], [box.east, box.north]], { padding, maxZoom: 14.5, duration });
}

/** MapLibre map of the current results. Loaded lazily: it is the one heavy chunk. */
export function MapPane(props: MapPaneProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const ready = useRef(false);
  const applied = useRef(0);
  const latest = useRef(props);
  latest.current = props;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    let map: MapLibreMap;
    try {
      map = new MapLibreMap({ container: ref.current, style: MAP_STYLE, center: [37.9, 0.2], zoom: 5.4, attributionControl: { compact: true } });
    } catch {
      setFailed(true);
      return;
    }
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(ref.current);
    let userMoving = false;
    map.on("movestart", (event) => { if (event.originalEvent) userMoving = true; });
    map.on("moveend", (event) => {
      if (!userMoving && !event.originalEvent) return;
      userMoving = false;
      const box = map.getBounds();
      latest.current.onUserMove({ west: box.getWest(), south: box.getSouth(), east: box.getEast(), north: box.getNorth() });
    });
    map.on("load", () => {
      const reduced = prefersReducedMotion();
      addGymLayers(map, reduced ? PIN_RADIUS : 0);
      ready.current = true;
      if (ref.current) ref.current.dataset.ready = "true";
      sync(map);
      if (!reduced) requestAnimationFrame(() => dropPinsIn(map));
      const { focus, padding } = latest.current;
      if (focus) { applied.current = focus.key; apply(map, focus, padding); }
      for (const layer of CLICKABLE_LAYERS) {
        map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
      }
      map.on("click", "pin-ring", (event: MapLayerMouseEvent) => {
        const slug = event.features?.[0]?.properties?.slug;
        if (typeof slug === "string") latest.current.onSelect(slug);
      });
      map.on("click", "cluster-top", (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        const id = feature?.properties?.cluster_id;
        if (id == null || feature?.geometry.type !== "Point") return;
        const center = feature.geometry.coordinates as [number, number];
        (map.getSource("gyms") as GeoJSONSource).getClusterExpansionZoom(id)
          .then((zoom) => map.easeTo({ center, zoom: zoom + 0.3, duration: prefersReducedMotion() ? 0 : 400 }))
          .catch(() => undefined);
      });
    });
    return () => { observer.disconnect(); map.remove(); mapRef.current = null; ready.current = false; };
  }, []);

  function sync(map: MapLibreMap) {
    const { pins, selected, origin } = latest.current;
    (map.getSource("gyms") as GeoJSONSource | undefined)?.setData(toFeatures(selected ? pins.filter((venue) => venue.id !== selected.id) : pins));
    (map.getSource("selected") as GeoJSONSource | undefined)?.setData(toFeatures(selected ? [selected] : []));
    (map.getSource("you") as GeoJSONSource | undefined)?.setData(pointFeature(origin));
  }

  useEffect(() => {
    if (mapRef.current && ready.current) sync(mapRef.current);
  }, [props.pins, props.selected, props.origin]);

  useEffect(() => {
    const map = mapRef.current;
    const { focus } = props;
    if (!map || !ready.current || !focus || focus.key === applied.current) return;
    applied.current = focus.key;
    apply(map, focus, latest.current.padding);
  }, [props.focus]); // eslint-disable-line react-hooks/exhaustive-deps

  if (failed) return <p className={styles.failed}>{props.failText}</p>;
  return <div ref={ref} className={styles.map} role="region" aria-label={props.label} data-testid="map" />;
}
