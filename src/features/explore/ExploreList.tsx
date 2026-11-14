import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import { MapPinned, SearchX } from "lucide-react";
import { useExplore } from "../../app/explore-context";
import { useCompare, useSaved } from "../../app/stores";
import { useT, useVenueContext } from "../../app/venue-context";
import { Button, EmptyState, SkeletonList } from "../../ui";
import { useReport } from "../report/report-store";
import { ResultCard } from "../results/ResultCard";
import { ListHeader } from "./ListHeader";
import type { RouteResults } from "./useRouteResults";
import styles from "./ExploreList.module.css";

export const PAGE = 40;

/** The list half of discovery: an explicit range, Load more, and cards that never count unreachable rows. */
export function ExploreList({ route }: { route: RouteResults }) {
  const tr = useT();
  const { error, origin, lang } = useVenueContext();
  const explore = useExplore();
  const saved = useSaved();
  const compare = useCompare();
  const report = useReport();
  const location = useLocation();
  const { results, scope, filters } = route;
  const list = useMemo(() => results?.list ?? [], [results]);
  const key = `${location.pathname}${location.search}|${origin ? "here" : ""}`;
  const [page, setPage] = useState({ key, limit: PAGE });
  const limit = page.key === key ? page.limit : PAGE;
  const [status, setStatus] = useState("");
  const { setPins, fitTo, flyTo, fittedKey, selectedId } = explore;

  useEffect(() => { setPins(list); }, [list, setPins]);
  // A new search, place or filter set fits the map once. Back to the same set keeps the map where it was.
  useEffect(() => {
    if (!results || scope.status !== "ready" || fittedKey.current === key) return;
    fittedKey.current = key;
    const s = scope.scope;
    if (s.kind === "bbox") return;
    if (s.kind === "all" && !filters.q && origin) flyTo(origin, 13);
    else if (list.length) fitTo(list);
    else if (s.kind === "place" && s.point) flyTo(s.point, 12);
  }, [key, results]); // eslint-disable-line react-hooks/exhaustive-deps
  // A pin picked on the map brings its card into the loaded range.
  useEffect(() => {
    const at = list.findIndex((venue) => venue.id === selectedId);
    if (at >= limit) setPage({ key, limit: Math.ceil((at + 1) / PAGE) * PAGE });
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return <EmptyState title={tr("loadError")} action={<Button variant="primary" onClick={() => window.location.reload()}>{tr("reload")}</Button>} />;
  }
  if (scope.status === "loading" || !results) return <SkeletonList count={4} label={tr("loadingGyms")} />;
  if (scope.status === "unknown") {
    return <EmptyState icon={SearchX} title={tr("placeUnknownTitle")}>{tr("placeUnknownBody")}</EmptyState>;
  }

  const kind = scope.scope.kind;
  const name = kind === "landmark" ? scope.scope.landmark.name : kind === "place" || kind === "county" ? scope.scope.name : "";
  const shown = list.slice(0, limit);

  let empty = null;
  if (list.length === 0) {
    const none = results.base.length === 0;
    empty = none && kind === "county" ? (
      <EmptyState icon={MapPinned} level={2} title={tr("countyNoneTitle", { county: name })}
        action={<Button variant="secondary" onClick={() => report.open("add_gym", null)}>{tr("menuAddGym")}</Button>}>
        {tr("countyNoneBody")}
      </EmptyState>
    ) : none && kind === "landmark" ? (
      <EmptyState icon={MapPinned} level={2} title={tr("nearNoneTitle", { landmark: name })}>{tr("nearNoneBody")}</EmptyState>
    ) : none && kind === "bbox" ? (
      <EmptyState icon={MapPinned} level={2} title={tr("areaEmptyTitle")}>{tr("areaEmptyBody")}</EmptyState>
    ) : (
      <EmptyState icon={SearchX} level={2} title={tr("listEmptyTitle")}
        action={<Button variant="secondary" onClick={route.clearFilters}>{tr("filtersClear")}</Button>}>
        {tr("listEmptyBody")}
      </EmptyState>
    );
  }

  return (
    <div className={`result-list ${styles.list}`}>
      <ListHeader route={route} />
      <p role="status" className={styles.toast}>{status}</p>
      {empty ?? (
        <>
          <p className={styles.range} aria-live="polite">{tr("showingRange", { from: 1, to: shown.length, total: list.length })}</p>
          <ul role="list" className={styles.cards}>
            {shown.map((venue) => (
              <li key={venue.id} id={`card-${venue.id}`}>
                <ResultCard
                  venue={venue}
                  origin={results.reference}
                  selected={selectedId === venue.id}
                  saved={saved.isSaved(venue.id)}
                  onSave={() => saved.toggle(venue)}
                  compared={compare.has(venue.id)}
                  onCompare={() => setStatus(compare.toggle(venue.id) ? "" : tr("compareFull"))}
                  compareDisabled={compare.ids.length >= 3}
                  lang={lang}
                />
              </li>
            ))}
          </ul>
          {list.length > limit && (
            <Button variant="secondary" wide onClick={() => setPage({ key, limit: limit + PAGE })}>
              {tr("loadMore", { n: Math.min(PAGE, list.length - limit) })}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
