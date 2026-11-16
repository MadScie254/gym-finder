import type { VenueKind } from "../../data/types";
import { countWith } from "../../lib/results";
import type { Filters } from "../../lib/urlState";
import type { RouteResults } from "./useRouteResults";

/** Live count for a chip: what the list would hold with `patch` applied to the current filters. */
export function useChipCount(route: RouteResults) {
  const { results, filters } = route;
  return (patch: Partial<Filters>) => (results ? countWith(results.base, filters, patch, results.reference) : undefined);
}

export function kindLabelKey(kind: VenueKind) {
  return `kind_${kind}` as const;
}
