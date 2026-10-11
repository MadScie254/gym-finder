import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadVenues, type VenueIndex } from "../data/loadVenues";
import type { LatLng, Venue } from "../data/types";
import { loadLanguage, saveLanguage } from "../lib/storage";
import type { Lang } from "../lib/i18n";

type VenueContextValue = {
  index: VenueIndex | null;
  error: string | null;
  loading: boolean;
  origin: LatLng | null;
  setOrigin: (point: LatLng | null) => void;
  locationNote: string | null;
  setLocationNote: (note: string | null) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
  offline: boolean;
  visible: Venue[];
  setVisible: (venues: Venue[]) => void;
};

const VenueContext = createContext<VenueContextValue | null>(null);

export function VenueProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState<VenueIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lang, setLangState] = useState<Lang>("en");
  const [offline, setOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false);
  const [visible, setVisible] = useState<Venue[]>([]);

  useEffect(() => {
    setLangState(loadLanguage());
    let active = true;
    loadVenues()
      .then((next) => { if (active) setIndex(next); })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load gyms");
      });
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      active = false;
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const value = useMemo<VenueContextValue>(() => ({
    index,
    error,
    loading: !index && !error,
    origin,
    setOrigin,
    locationNote,
    setLocationNote,
    selectedId,
    setSelectedId,
    lang,
    setLang: (next) => {
      saveLanguage(next);
      setLangState(next);
    },
    offline,
    visible,
    setVisible,
  }), [index, error, origin, locationNote, selectedId, lang, offline, visible]);

  return <VenueContext.Provider value={value}>{children}</VenueContext.Provider>;
}

export function useVenueContext(): VenueContextValue {
  const value = useContext(VenueContext);
  if (!value) throw new Error("useVenueContext outside provider");
  return value;
}

void type;
