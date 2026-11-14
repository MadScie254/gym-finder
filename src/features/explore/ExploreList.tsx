import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { MapPinned, SearchX } from "lucide-react";
import { useExplore } from "../../app/explore-context";
import { useReport } from "../report/report-store";
import { useT, useVenueContext } from "../../app/venue-context";
import { parseHours } from "../../lib/hours";
import { filterToBounds } from "../../lib/viewport";
import { ActionRow } from "../../ui/ActionRow";
import { Button } from "../../ui/Button";
import { EmptyState } from "../../ui/EmptyState";
import { GymCard, type CardLinkProps } from "../../ui/GymCard";
import { SkeletonList } from "../../ui/Skeleton";
import { kindLabelKey } from "./chipCount";
import { kmFrom, placeLine, useGymTools } from "../gym/gymTools";
import { ListHeader } from "./ListHeader";
import { useRouteResults } from "./useRouteResults";
import styles from "./ExploreList.module.css";

const PAGE = 30;

function RouterLink({ href, className, children }: CardLinkProps) {
  return <Link to={href} className={className}>{children}</Link>;
}

/** The list half of the map-and-list control (plan G1): results, filtered to the map view once it moves. */
export function ExploreList() {
  const tr = useT();
  const { error, origin } = useVenueContext();
  const explore = useExplore();
  const report = useReport();
  const route = useRouteResults();
  const tools = useGymTools();
  const location = useLocation();
  const [limit, setLimit] = useState(PAGE);
  const { results, scope, filters } = route;
  const list = useMemo(() => results?.list ?? [], [results]);
  const shown = useMemo(() => filterToBounds(list, explore.area), [list, explore.area]);
  const { setPins, setArea, setSelected, fitTo, flyTo } = explore;
  const key = `${location.pathname}${location.search}|${origin ? "here" : ""}|${results ? "ready" : ""}`;

  useEffect(() => { setSelected(null); }, [setSelected]);
  useEffect(() => { setPins(list); }, [list, setPins]);
  // A new search, place or filter set resets the viewport filter and fits the map to the results.
  useEffect(() => {
    if (!results) return;
    setArea(null);
    setLimit(PAGE);
    const wholeCountry = scope.status === "ready" && scope.scope.kind === "all" && !filters.q;
    if (wholeCountry && origin) flyTo(origin, 13);
    else if (list.length) fitTo(list.map((venue) => ({ lat: venue.lat, lng: venue.lng })));
    else if (scope.status === "ready" && scope.scope.kind === "place" && scope.scope.point) flyTo(scope.scope.point, 12);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return <EmptyState title={tr("loadError")} action={<Button variant="primary" onClick={() => window.location.reload()}>{tr("reload")}</Button>} />;
  }
  if (scope.status === "loading" || !results) return <SkeletonList count={4} label={tr("loadingGyms")} />;
  if (scope.status === "unknown") {
    return <EmptyState icon={SearchX} title={tr("placeUnknownTitle")}>{tr("placeUnknownBody")}</EmptyState>;
  }

  const kind = scope.scope.kind;
  const name = kind === "landmark" ? scope.scope.landmark.name : kind === "all" ? "" : scope.scope.name;

  return (
    <div className={styles.list}>
      <ListHeader route={route} shownCount={shown.length} />
      <p className="sr-only" role="status">{tools.status}</p>
      {tools.status && <p className={styles.toast} aria-hidden="true">{tools.status}</p>}
      {shown.length === 0 ? (
        explore.area && list.length > 0 ? (
          <EmptyState icon={MapPinned} title={tr("areaEmptyTitle")} level={2}
            action={<Button variant="secondary" onClick={() => { setArea(null); fitTo(list); }}>{tr("showWholeList")}</Button>}>
            {tr("areaEmptyBody")}
          </EmptyState>
        ) : results.base.length === 0 && kind !== "all" ? (
          <EmptyState icon={MapPinned} level={2}
            title={kind === "county" ? tr("countyNoneTitle", { county: name }) : kind === "landmark" ? tr("nearNoneTitle", { landmark: name }) : tr("listEmptyTitle")}
            action={kind === "county" ? <Button variant="secondary" onClick={() => report.open("add_gym", null)}>{tr("menuAddGym")}</Button> : undefined}>
            {kind === "county" ? tr("countyNoneBody") : kind === "landmark" ? tr("nearNoneBody") : tr("listEmptyBody")}
          </EmptyState>
        ) : (
          <EmptyState icon={SearchX} level={2} title={tr("listEmptyTitle")}
            action={<Button variant="secondary" onClick={route.clearFilters}>{tr("filtersClear")}</Button>}>
            {tr("listEmptyBody")}
          </EmptyState>
        )
      ) : (
        <ul role="list" className={styles.cards}>
          {shown.slice(0, limit).map((venue) => (
            <li key={venue.id}>
              <GymCard
                name={venue.name}
                href={`/gym/${venue.slug}`}
                place={placeLine(venue, tr)}
                kind={tr(kindLabelKey(venue.kind))}
                tier={venue.trust.tier}
                km={kmFrom(results.reference, venue)}
                open={parseHours(venue.hours?.raw).state === "open"}
                renderLink={RouterLink}
                level={2}
                actions={<ActionRow actions={tools.cardActions(venue)} label={tr("contactGroup", { name: venue.name })} />}
              />
            </li>
          ))}
        </ul>
      )}
      {shown.length > limit && (
        <Button variant="secondary" wide onClick={() => setLimit((n) => n + PAGE)}>
          {tr("showMore", { n: Math.min(PAGE, shown.length - limit) })}
        </Button>
      )}
    </div>
  );
}
