import { useCallback, useState } from "react";
import { haversineKm } from "../../lib/kenya";
import { DEMO_STORES, DEMO_TOWNS } from "./data";
import type { LatLng } from "./recommend";

const TOWN_KEY = "fmg-fuel-town-v1";
export const DEFAULT_TOWN = "Nairobi";

function readTown(): string {
  try {
    const stored = window.localStorage.getItem(TOWN_KEY);
    return stored && DEMO_TOWNS.includes(stored) ? stored : DEFAULT_TOWN;
  } catch {
    return DEFAULT_TOWN;
  }
}

function writeTown(town: string) {
  try { window.localStorage.setItem(TOWN_KEY, town); } catch { /* Optional. */ }
}

export type LocateStatus = "idle" | "locating" | "found" | "failed";

/**
 * The chosen town is remembered on this device. A shared location is kept in
 * memory only, used for straight-line distances, and never sent anywhere.
 */
export function useTown() {
  const [town, setTownState] = useState(readTown);
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<LocateStatus>("idle");

  const setTown = useCallback((next: string) => {
    setTownState(next);
    writeTown(next);
    setOrigin(null);
    setStatus("idle");
  }, []);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("failed");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition((position) => {
      const point = { lat: position.coords.latitude, lng: position.coords.longitude };
      const nearest = [...DEMO_STORES].sort((a, b) => haversineKm(point, a.location) - haversineKm(point, b.location))[0];
      setOrigin(point);
      if (nearest) {
        setTownState(nearest.town);
        writeTown(nearest.town);
      }
      setStatus("found");
    }, () => setStatus("failed"), { maximumAge: 300_000, timeout: 10_000 });
  }, []);

  return { town, setTown, origin, locate, status };
}
