import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useT } from "../../app/venue-context";
import { activeFilterCount, KIND_FILTERS } from "../../lib/urlState";
import { Chip } from "../../ui/Chip";
import { kindLabelKey, useChipCount } from "./chipCount";
import { FilterDialog } from "./FilterDialog";
import type { RouteResults } from "./useRouteResults";
import styles from "./FilterBar.module.css";

/** Quick filters in one sideways-scrolling row, plus the full set in a dialog (plan G3). */
export function FilterBar({ route }: { route: RouteResults }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const { filters, results, setFilters } = route;
  const count = useChipCount(route);
  const noReference = !results?.reference;
  const active = activeFilterCount(filters);
  const kinds = KIND_FILTERS.filter((kind) => kind === filters.kind || (count({ kind }) ?? 0) > 0).slice(0, 5);

  return (
    <div className={styles.bar} role="group" aria-label={tr("filtersLabel")}>
      <Chip
        label={tr("filtersButton")}
        icon={SlidersHorizontal}
        selected={false}
        opensDialog
        count={active || undefined}
        countNoun={tr("filtersButton").toLowerCase()}
        onToggle={() => setOpen(true)}
      />
      <Chip label={tr("filterOpenNow")} selected={filters.open} count={count({ open: true })} onToggle={() => setFilters({ open: !filters.open })} />
      <Chip label={tr("filterHasPhone")} selected={filters.phone} count={count({ phone: true })} onToggle={() => setFilters({ phone: !filters.phone })} />
      <Chip
        label={tr("filterWithin", { km: 5 })}
        selected={filters.km === 5}
        disabled={noReference}
        count={noReference ? undefined : count({ km: 5 })}
        onToggle={() => setFilters({ km: filters.km === 5 ? null : 5 })}
      />
      <Chip label={tr("filterTrusted")} selected={filters.trust === "strong"} count={count({ trust: "strong" })} onToggle={() => setFilters({ trust: filters.trust === "strong" ? "any" : "strong" })} />
      {kinds.map((kind) => (
        <Chip key={kind} label={tr(kindLabelKey(kind))} selected={filters.kind === kind} count={count({ kind })} onToggle={() => setFilters({ kind: filters.kind === kind ? null : kind })} />
      ))}
      <FilterDialog route={route} open={open} onOpenChange={setOpen} />
    </div>
  );
}
