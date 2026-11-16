import { useState } from "react";
import { X } from "lucide-react";
import { useExplore } from "../../app/explore-context";
import { useCompare, useSaved } from "../../app/stores";
import { useT, useVenueContext } from "../../app/venue-context";
import { IconButton } from "../../ui";
import { ResultCard } from "../results/ResultCard";
import type { RouteResults } from "./useRouteResults";
import styles from "./Discovery.module.css";

/** Phones, map view: the gym whose pin was tapped, in a small sheet with View gym, Save and Compare. */
export function MapPreview({ route }: { route: RouteResults }) {
  const tr = useT();
  const { lang } = useVenueContext();
  const { selectedId, setSelectedId } = useExplore();
  const saved = useSaved();
  const compare = useCompare();
  const [status, setStatus] = useState("");
  const venue = route.results?.list.find((item) => item.id === selectedId);
  if (!venue) return null;
  return (
    <section className={styles.preview} aria-label={tr("previewTitle")}>
      <div className={styles.previewClose}>
        <IconButton icon={X} label={tr("reportDone")} variant="quiet" onClick={() => setSelectedId(null)} />
      </div>
      <ResultCard
        venue={venue}
        origin={route.results?.reference ?? null}
        selected={false}
        saved={saved.isSaved(venue.id)}
        onSave={() => saved.toggle(venue)}
        compared={compare.has(venue.id)}
        onCompare={() => setStatus(compare.toggle(venue.id) ? "" : tr("compareFull"))}
        compareDisabled={compare.ids.length >= 3}
        lang={lang}
      />
      <p role="status" className="sr-only">{status}</p>
    </section>
  );
}
