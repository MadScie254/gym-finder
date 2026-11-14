import { useExplore } from "../../app/explore-context";
import { useT, useVenueContext } from "../../app/venue-context";
import { plural } from "../../lib/i18n";
import type { SortOrder } from "../../lib/urlState";
import type { RouteResults } from "./useRouteResults";
import styles from "./ExploreList.module.css";

/** Title, count and order for the list. Once the map moves, the title counts the gyms in view. */
export function ListHeader({ route, shownCount }: { route: RouteResults; shownCount: number }) {
  const tr = useT();
  const { origin, locationNote } = useVenueContext();
  const { area, setArea, fitTo } = useExplore();
  const { results, scope, filters, setFilters } = route;
  if (!results || scope.status !== "ready") return null;
  const s = scope.scope;
  const total = plural(tr, results.list.length, "gymsOne", "gymsMany");

  let title: string;
  if (area) title = plural(tr, shownCount, "areaCountOne", "areaCountMany");
  else if (s.kind === "place") title = tr("titlePlace", { place: s.name });
  else if (s.kind === "county") title = tr("titleCounty", { county: s.name });
  else if (s.kind === "landmark") title = tr("titleNear", { landmark: s.landmark.name });
  else if (filters.q) title = tr("titleSearch", { q: filters.q });
  else title = tr("titleAll");

  const sub = s.kind === "landmark" ? tr("subNear", { landmark: s.landmark.name }) : total;
  const sorts: { value: SortOrder; label: string }[] = [
    { value: "distance", label: tr("sortDistance") },
    { value: "trust", label: tr("sortTrust") },
  ];

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      {area ? (
        <button type="button" className={styles.reset} onClick={() => { setArea(null); fitTo(results.list); }}>
          {tr("showWholeList")}
        </button>
      ) : (
        <p className={styles.sub}>{sub}</p>
      )}
      {locationNote && locationNote !== "locationShared" && <p className={styles.note}>{tr(locationNote)}</p>}
      {!origin && !locationNote && s.kind !== "landmark" && <p className={styles.note}>{tr("subNoLocation")}</p>}
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
