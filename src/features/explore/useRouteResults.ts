import { useEffect, useMemo, useState } from "react";
import { matchPath, useLocation, useNavigate, useSearchParams } from "react-router";
import { useVenueContext } from "../../app/venue-context";
import { loadLandmarks, type Landmark } from "../../lib/landmarks";
import { resolveArea, resolveCounty } from "../../lib/places";
import { computeResults, type Results, type Scope } from "../../lib/results";
import { parseFilters, queryString, writeFilters, type Filters } from "../../lib/urlState";
import { parseBounds } from "../../lib/viewport";

export type ScopeState = { status: "ready"; scope: Scope } | { status: "loading" } | { status: "unknown" };

/** Which slice of the catalogue the current URL asks for. */
export function useRouteScope(): ScopeState {
  const { index } = useVenueContext();
  const { pathname, search } = useLocation();
  const bbox = pathname.startsWith("/search") ? new URLSearchParams(search).get("bbox") : null;
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const near = matchPath("/near/:slug/*", pathname);
  const nearSlug = near?.params.slug;

  useEffect(() => {
    if (nearSlug && !landmarks) loadLandmarks().then(setLandmarks).catch(() => setLandmarks([]));
  }, [nearSlug, landmarks]);

  return useMemo<ScopeState>(() => {
    if (!index) return { status: "loading" };
    const place = matchPath("/in/:place/*", pathname)?.params.place;
    if (place) {
      const area = resolveArea(index.venues, place);
      return area ? { status: "ready", scope: { kind: "place", name: area.name, point: area.point } } : { status: "unknown" };
    }
    const county = matchPath("/county/:county/*", pathname)?.params.county;
    if (county) {
      const found = resolveCounty(county);
      return found ? { status: "ready", scope: { kind: "county", name: found.name } } : { status: "unknown" };
    }
    if (nearSlug) {
      if (!landmarks) return { status: "loading" };
      const landmark = landmarks.find((item) => item.slug === nearSlug);
      return landmark ? { status: "ready", scope: { kind: "landmark", landmark } } : { status: "unknown" };
    }
    const bounds = parseBounds(bbox);
    if (bounds) return { status: "ready", scope: { kind: "bbox", bounds } };
    return { status: "ready", scope: { kind: "all" } };
  }, [index, pathname, nearSlug, landmarks, bbox]);
}

export type RouteResults = {
  scope: ScopeState;
  filters: Filters;
  results: Results | null;
  /** Change filters. Each change is a history entry, so Back undoes it, unless `replace` is set. */
  setFilters: (patch: Partial<Filters>, replace?: boolean) => void;
  clearFilters: () => void;
  searchArea: (bounds: string) => void;
};

export function useRouteResults(): RouteResults {
  const { index, origin } = useVenueContext();
  const scope = useRouteScope();
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const filters = useMemo(() => parseFilters(params), [params]);
  const results = useMemo(
    () => (index && scope.status === "ready" ? computeResults(index, scope.scope, filters, origin) : null),
    [index, scope, filters, origin],
  );

  function setFilters(patch: Partial<Filters>, replace = false) {
    navigate(`${pathname}${queryString(writeFilters({ ...filters, ...patch }, params))}`, { replace });
  }

  /** "Search this area": list the gyms inside the map view, keeping the filters. */
  function searchArea(bounds: string) {
    const next = writeFilters(filters, params);
    next.set("bbox", bounds);
    navigate(`/search${queryString(next)}`);
  }

  function clearFilters() {
    navigate(`${pathname}${queryString(writeFilters({ ...filters, kind: null, km: null, trust: "any", phone: false, open: false }, params))}`);
  }

  return { scope, filters, results, setFilters, clearFilters, searchArea };
}
