import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { List, Map as MapIcon, Search } from "lucide-react";
import { useExplore } from "../../app/explore-context";
import { useMediaQuery, WIDE_QUERY } from "../../app/useMediaQuery";
import { useT, useVenueContext } from "../../app/venue-context";
import { formatBounds, type Bounds } from "../../lib/viewport";
import { Button, Skeleton } from "../../ui";
import { GymSearch } from "../search/GymSearch";
import { ExploreList } from "./ExploreList";
import { FilterBar } from "./FilterBar";
import { MapPreview } from "./MapPreview";
import { useRouteResults } from "./useRouteResults";
import styles from "./Discovery.module.css";

const MapPane = lazy(async () => ({ default: (await import("../map/MapPane")).MapPane }));

/**
 * `/search` and `/in/:place`: list beside the map on desktop, a List/Map switch on phones.
 * Moving the map offers "Search this area"; it never reorders or filters the list by itself.
 */
export function Discovery() {
  const tr = useT();
  const { origin } = useVenueContext();
  const wide = useMediaQuery(WIDE_QUERY);
  const explore = useExplore();
  const route = useRouteResults();
  const location = useLocation();
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<Bounds | null>(null);
  const showList = wide || explore.mode === "list";
  const showMap = wide || explore.mode === "map";
  const scrollKey = `${location.pathname}${location.search}`;
  const ready = Boolean(route.results);

  // Back from a gym puts the list where it was.
  useLayoutEffect(() => {
    const node = listRef.current;
    if (!node || !ready) return;
    node.scrollTop = explore.scroll.current.get(scrollKey) ?? 0;
    const save = () => explore.scroll.current.set(scrollKey, node.scrollTop);
    node.addEventListener("scroll", save, { passive: true });
    return () => node.removeEventListener("scroll", save);
  }, [scrollKey, ready, showList]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPending(null); }, [scrollKey]);
  useEffect(() => { document.title = `${tr("navFind")}. ${tr("brand")}`; }, [tr]);

  function select(slug: string, id: string) {
    explore.setSelectedId(id);
    if (wide) requestAnimationFrame(() => document.getElementById(`card-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
    else if (!route.results?.list.some((venue) => venue.id === id)) navigate(`/gym/${slug}`);
  }

  return (
    <div className={styles.discovery} data-wide={wide || undefined} data-mode={explore.mode}>
      <div className={styles.controls}>
        <div className={styles.search}><GymSearch /></div>
        <FilterBar route={route} />
        {!wide && (
          <div className={styles.switch} role="group" aria-label={tr("viewSwitch")}>
            {(["list", "map"] as const).map((mode) => (
              <button key={mode} type="button" aria-pressed={explore.mode === mode} onClick={() => explore.setMode(mode)}>
                {mode === "list" ? <List aria-hidden="true" size={18} /> : <MapIcon aria-hidden="true" size={18} />}
                {tr(mode === "list" ? "viewList" : "viewMap")}
              </button>
            ))}
          </div>
        )}
      </div>
      {showList && (
        <div ref={listRef} className={styles.listCol}>
          <ExploreList route={route} />
        </div>
      )}
      {showMap && (
        <div className={styles.mapCol}>
          <Suspense fallback={<div className={styles.mapLoading} role="status"><span className="sr-only">{tr("mapLoading")}</span><Skeleton height="100%" radius="card" /></div>}>
            <MapPane
              venues={explore.pins}
              selectedId={explore.selectedId}
              origin={origin}
              focus={explore.focus}
              initialCamera={explore.camera}
              onCamera={explore.setCamera}
              onSelect={select}
              onUserMove={setPending}
              padding={{ top: 64, bottom: wide ? 48 : 180, left: 48, right: 48 }}
              label={tr("mapLabel")}
              failText={tr("mapFailed")}
            />
          </Suspense>
          {pending && (
            <div className={styles.areaButton}>
              <Button variant="primary" icon={Search} onClick={() => { route.searchArea(formatBounds(pending)); setPending(null); }}>
                {tr("searchThisArea")}
              </Button>
            </div>
          )}
          {!wide && <MapPreview route={route} />}
        </div>
      )}
    </div>
  );
}
