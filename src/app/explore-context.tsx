import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { LatLng, Venue } from "../data/types";
import type { SheetStop } from "../ui/Sheet";
import type { Bounds } from "../lib/viewport";

/** A request for the map to move. `key` changes on every request, so the same target can be asked twice. */
export type MapFocus =
  | { key: number; kind: "fit"; points: LatLng[] }
  | { key: number; kind: "fly"; point: LatLng; zoom: number };

type ExploreValue = {
  /** Gyms drawn on the map: the current results before the viewport filter. */
  pins: Venue[];
  setPins: (venues: Venue[]) => void;
  selected: Venue | null;
  setSelected: (venue: Venue | null) => void;
  /** The map view after the visitor panned or zoomed it. Null until they do. */
  area: Bounds | null;
  setArea: (bounds: Bounds | null) => void;
  focus: MapFocus | null;
  fitTo: (points: LatLng[]) => void;
  flyTo: (point: LatLng, zoom?: number) => void;
  stop: SheetStop;
  setStop: (stop: SheetStop) => void;
  wide: boolean;
};

const ExploreContext = createContext<ExploreValue | null>(null);

/** Shared between the list or detail panel and the map, so they act as one control (plan G1). */
export function ExploreProvider({ wide, children }: { wide: boolean; children: ReactNode }) {
  const [pins, setPins] = useState<Venue[]>([]);
  const [selected, setSelected] = useState<Venue | null>(null);
  const [area, setArea] = useState<Bounds | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [stop, setStop] = useState<SheetStop>("half");
  const counter = useRef(0);

  const fitTo = useCallback((points: LatLng[]) => {
    counter.current += 1;
    setFocus({ key: counter.current, kind: "fit", points });
  }, []);
  const flyTo = useCallback((point: LatLng, zoom = 15) => {
    counter.current += 1;
    setFocus({ key: counter.current, kind: "fly", point, zoom });
  }, []);

  const value = useMemo<ExploreValue>(() => ({
    pins, setPins, selected, setSelected, area, setArea, focus, fitTo, flyTo, stop, setStop, wide,
  }), [pins, selected, area, focus, fitTo, flyTo, stop, wide]);

  return <ExploreContext.Provider value={value}>{children}</ExploreContext.Provider>;
}

export function useExplore(): ExploreValue {
  const value = useContext(ExploreContext);
  if (!value) throw new Error("useExplore outside ExploreProvider");
  return value;
}
