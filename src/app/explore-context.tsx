import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import type { LatLng, Venue } from "../data/types";

/** A request for the map to move. `key` changes on every request, so the same target can be asked twice. */
export type MapFocus =
  | { key: number; kind: "fit"; points: LatLng[] }
  | { key: number; kind: "fly"; point: LatLng; zoom: number };

export type Camera = { center: LatLng; zoom: number };

type ExploreValue = {
  /** Gyms drawn on the map: the current results. */
  pins: Venue[];
  setPins: (venues: Venue[]) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  focus: MapFocus | null;
  fitTo: (points: LatLng[]) => void;
  flyTo: (point: LatLng, zoom?: number) => void;
  /** Where the map was left, so Back from a gym puts it back. */
  camera: Camera | null;
  setCamera: (camera: Camera) => void;
  /** The result set the map was last fitted to; a remount with the same key does not refit. */
  fittedKey: RefObject<string>;
  /** List scroll position per result set, restored on Back. */
  scroll: RefObject<Map<string, number>>;
  /** Mobile: list or map. */
  mode: "list" | "map";
  setMode: (mode: "list" | "map") => void;
};

const ExploreContext = createContext<ExploreValue | null>(null);

/**
 * Discovery state that outlives the discovery screen: it sits above the routes, so opening a
 * gym and coming Back keeps the selected gym, map position, list scroll and list/map choice.
 */
export function ExploreProvider({ children }: { children: ReactNode }) {
  const [pins, setPins] = useState<Venue[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [mode, setMode] = useState<"list" | "map">("list");
  const cameraRef = useRef<Camera | null>(null);
  const fittedKey = useRef("");
  const scroll = useRef(new Map<string, number>());
  const counter = useRef(0);

  const fitTo = useCallback((points: LatLng[]) => {
    counter.current += 1;
    setFocus({ key: counter.current, kind: "fit", points: points.map((p) => ({ lat: p.lat, lng: p.lng })) });
  }, []);
  const flyTo = useCallback((point: LatLng, zoom = 15) => {
    counter.current += 1;
    setFocus({ key: counter.current, kind: "fly", point: { lat: point.lat, lng: point.lng }, zoom });
  }, []);
  const setCamera = useCallback((camera: Camera) => { cameraRef.current = camera; }, []);

  const value = useMemo<ExploreValue>(() => ({
    pins, setPins, selectedId, setSelectedId, focus, fitTo, flyTo,
    get camera() { return cameraRef.current; },
    setCamera, fittedKey, scroll, mode, setMode,
  }), [pins, selectedId, focus, fitTo, flyTo, setCamera, mode]);

  return <ExploreContext.Provider value={value}>{children}</ExploreContext.Provider>;
}

export function useExplore(): ExploreValue {
  const value = useContext(ExploreContext);
  if (!value) throw new Error("useExplore outside ExploreProvider");
  return value;
}
