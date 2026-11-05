import { useEffect, useState } from "react";
import { loadVenues, type VenueIndex } from "./loadVenues";

export function useVenues() {
  const [index, setIndex] = useState<VenueIndex | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadVenues()
      .then((next) => { if (active) setIndex(next); })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load gyms");
      });
    return () => { active = false; };
  }, []);

  return { index, error, loading: !index && !error };
}
