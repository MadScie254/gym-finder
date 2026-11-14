import { useT, useVenueContext } from "../../app/venue-context";
import { plural } from "../../lib/i18n";
import type { SortOrder } from "../../lib/urlState";
import type { RouteResults } from "./useRouteResults";
import styles from "./ExploreList.module.css";

/** Title, what distances are measured from, and the order. */
export function ListHeader({ route }: { route: RouteResults }) {
  const tr = useT();
  const { origin, locationNote } = useVenueContext();
  const { results, scope, filters, setFilters } = route;
  if (!results || scope.status !== "ready") return null;
  const s = scope.scope;

  let title: string;
  if (s.kind === "place") title = tr("titlePlace", { place: s.name });
  else if (s.kind === "county") title = tr("titleCounty", { county: s.name });
  else if (s.kind === "landmark") title = tr("titleNear", { landmark: s.landmark.name });
  else if (s.kind === "bbox") title = tr("titleArea");
  else if (filters.q) title = tr("titleSearch", { q: filters.q });
  else title = tr("titleAll");

  // Distance is shown only from a real, named point.
  const reference = s.kind === "landmark" ? tr("subNear", { landmark: s.landmark.name }) : origin ? tr("distanceFromYou") : null;
  const sorts: { value: SortOrder; label: string }[] = [
    { value: "distance", label: tr("sortDistance") },
    { value: "trust", label: tr("sortTrust") },
  ];

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.sub}>{plural(tr, results.list.length, "gymsOne", "gymsMany")}{reference ? `. ${reference}` : ""}</p>
      {locationNote && locationNote !== "locationShared" && <p className={styles.note}>{tr(locationNote)}</p>}
      {results.reference && (
        <div className={styles.sort} role="group" aria-label={tr("filterGroupSort")}>
          {sorts.map((row) => (
            <button key={row.value} type="button" className={styles.sortOption} aria-pressed={results.sort === row.value} onClick={() => setFilters({ sort: row.value })}>
              {row.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
