import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadVenues, type VenueIndex } from "../data/loadVenues";
import type { LatLng } from "../data/types";
import { t, type CopyKey, type Lang, type Translate } from "../lib/i18n";
import { isInKenya } from "../lib/kenya";
import { loadLanguage, saveLanguage } from "../lib/storage";

type VenueContextValue = {
  index: VenueIndex | null;
  error: string | null;
  loading: boolean;
  /** The visitor's position. Never sent anywhere; null until they share it. */
  origin: LatLng | null;
  setOrigin: (point: LatLng | null) => void;
  /** Outcome of the last "Use my location", as a copy key. */
  locationNote: CopyKey | null;
  locate: () => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
  offline: boolean;
};

const VenueContext = createContext<VenueContextValue | null>(null);

export function VenueProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState<VenueIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [locationNote, setLocationNote] = useState<CopyKey | null>(null);
  const [lang, setLangState] = useState<Lang>(() => loadLanguage());
  const [offline, setOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false);

  useEffect(() => {
    let active = true;
    loadVenues()
      .then((next) => { if (active) setIndex(next); })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "load failed");
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

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const locate = useCallback(() => {
    if (!navigator.geolocation) { setLocationNote("locationUnsupported"); return; }
    navigator.geolocation.getCurrentPosition((position) => {
      const point = { lat: position.coords.latitude, lng: position.coords.longitude };
      if (!isInKenya(point)) { setLocationNote("locationOutside"); setOrigin(null); return; }
      setLocationNote("locationShared");
      setOrigin(point);
    }, () => { setLocationNote("locationDenied"); }, { enableHighAccuracy: false, timeout: 15_000, maximumAge: 300_000 });
  }, []);

  const setLang = useCallback((next: Lang) => { saveLanguage(next); setLangState(next); }, []);

  const value = useMemo<VenueContextValue>(() => ({
    index, error, loading: !index && !error, origin, setOrigin, locationNote, locate, lang, setLang, offline,
  }), [index, error, origin, locationNote, locate, lang, setLang, offline]);

  return <VenueContext.Provider value={value}>{children}</VenueContext.Provider>;
}

export function useVenueContext(): VenueContextValue {
  const value = useContext(VenueContext);
  if (!value) throw new Error("useVenueContext outside provider");
  return value;
}

/** The translate function for the visitor's language. */
export function useT(): Translate {
  const { lang } = useVenueContext();
  return useCallback((key, vars) => t(lang, key, vars), [lang]);
}
