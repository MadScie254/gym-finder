import type { ReactNode } from "react";
import { useT } from "../../app/venue-context";
import { isParsedHours } from "../../lib/hours";
import { plural } from "../../lib/i18n";
import { DISTANCE_FILTERS, KIND_FILTERS, type TrustFilter } from "../../lib/urlState";
import { Button } from "../../ui/Button";
import { Chip } from "../../ui/Chip";
import { Dialog } from "../../ui/Dialog";
import { kindLabelKey, useChipCount } from "./chipCount";
import type { RouteResults } from "./useRouteResults";
import styles from "./FilterBar.module.css";

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{title}</legend>
      <div className={styles.chips}>{children}</div>
      {note && <p className={styles.note}>{note}</p>}
    </fieldset>
  );
}

const TRUST: { value: TrustFilter; key: "filterAnyTrust" | "filterTrusted" | "filterVerified" }[] = [
  { value: "any", key: "filterAnyTrust" },
  { value: "strong", key: "filterTrusted" },
  { value: "verified", key: "filterVerified" },
];

/** Every filter with its live count. Changes apply at once; the footer button says how many gyms are left. */
export function FilterDialog({ route, open, onOpenChange }: { route: RouteResults; open: boolean; onOpenChange: (open: boolean) => void }) {
  const tr = useT();
  const { filters, results, setFilters, clearFilters } = route;
  const count = useChipCount(route);
  const set = (patch: Parameters<typeof setFilters>[0]) => setFilters(patch, true);
  const noReference = !results?.reference;
  const total = results?.list.length ?? 0;
  const base = results?.base ?? [];
  const coverage = { hours: base.filter((venue) => isParsedHours(venue.hours?.raw)).length, total: base.length };
  const showLabel = total === 0 ? tr("filtersShowNone") : plural(tr, total, "filtersShowOne", "filtersShowMany");

  return (
    <Dialog
      title={tr("filtersTitle")}
      open={open}
      onOpenChange={onOpenChange}
      footer={(
        <>
          <Button variant="secondary" onClick={clearFilters}>{tr("filtersClear")}</Button>
          <Button variant="primary" onClick={() => onOpenChange(false)}>{showLabel}</Button>
        </>
      )}
    >
      <div className={styles.dialogBody}>
        <Group title={tr("filterGroupType")}>
          {KIND_FILTERS.map((kind) => (
            <Chip key={kind} label={tr(kindLabelKey(kind))} selected={filters.kind === kind} count={count({ kind })} onToggle={() => set({ kind: filters.kind === kind ? null : kind })} />
          ))}
        </Group>
        <Group title={tr("filterGroupDistance")} note={noReference ? tr("filterNeedsLocation") : undefined}>
          {DISTANCE_FILTERS.map((km) => (
            <Chip key={km} label={tr("filterWithin", { km })} selected={filters.km === km} disabled={noReference} count={noReference ? undefined : count({ km })} onToggle={() => set({ km: filters.km === km ? null : km })} />
          ))}
        </Group>
        <Group title={tr("filterGroupTrust")}>
          {TRUST.map((row) => (
            <Chip key={row.value} label={tr(row.key)} selected={filters.trust === row.value} count={count({ trust: row.value })} onToggle={() => set({ trust: row.value })} />
          ))}
        </Group>
        <Group title={tr("filterGroupMore")} note={tr("filterCoverage", { hours: coverage.hours, total: coverage.total })}>
          <Chip label={tr("filterHasPhone")} selected={filters.phone} count={count({ phone: true })} onToggle={() => set({ phone: !filters.phone })} />
          <Chip label={tr("filterOpenNow")} selected={filters.open} count={count({ open: true })} onToggle={() => set({ open: !filters.open })} />
        </Group>
        <Group title={tr("filterGroupSort")} note={noReference ? tr("sortNeedsLocation") : undefined}>
          <Chip label={tr("sortDistance")} selected={results?.sort === "distance"} disabled={noReference} onToggle={() => set({ sort: "distance" })} />
          <Chip label={tr("sortTrust")} selected={results?.sort === "trust"} onToggle={() => set({ sort: "trust" })} />
        </Group>
      </div>
    </Dialog>
  );
}
