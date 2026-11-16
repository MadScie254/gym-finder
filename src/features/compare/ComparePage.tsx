import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Share2 } from "lucide-react";
import { Page } from "../../app/Page";
import { useCompare } from "../../app/stores";
import { useMediaQuery, WIDE_QUERY } from "../../app/useMediaQuery";
import { useT, useVenueContext } from "../../app/venue-context";
import { searchVenues } from "../../data/loadVenues";
import type { Venue } from "../../data/types";
import { comparePath, parseCompareIds } from "../../lib/compare";
import { absoluteUrl, shareLink } from "../../lib/share";
import { Button, buttonClassName, EmptyState, SearchField } from "../../ui";
import { CompareTable } from "./CompareTable";
import styles from "./Compare.module.css";

/** Up to three gyms side by side (G5). The link carries the choice; nobody types ids. */
export function ComparePage() {
  const tr = useT();
  const { index } = useVenueContext();
  const compare = useCompare();
  const wide = useMediaQuery(WIDE_QUERY);
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const fromUrl = params.has("ids") ? parseCompareIds(params.get("ids")) : null;
  const ids = fromUrl ?? compare.ids;
  const venues = useMemo(() => ids.map((id) => index?.byId.get(id)).filter((venue): venue is Venue => venue != null), [ids, index]);
  const missing = index ? ids.length - venues.length : 0;
  const [pair, setPair] = useState<[number, number]>([0, 1]);

  // A shared link becomes this device's compare list, and the URL always reflects the list.
  useEffect(() => {
    if (fromUrl && fromUrl.join(",") !== compare.ids.join(",")) compare.set(fromUrl);
    else if (!fromUrl && compare.ids.length) setParams({ ids: compare.ids.join(",") }, { replace: true });
  }, [params.get("ids")]);

  function update(next: string[]) {
    compare.set(next);
    setParams(next.length ? { ids: next.join(",") } : {}, { replace: true });
  }

  const options = useMemo(() => (index && query.trim().length >= 2
    ? searchVenues(index, query).filter((venue) => !ids.includes(venue.id)).slice(0, 6).map((venue) => ({ id: venue.id, label: venue.name, hint: [venue.area, venue.county].filter(Boolean).join(", ") }))
    : []), [index, query, ids]);

  const shown = wide ? venues : [venues[pair[0]], venues[pair[1]]].filter((venue): venue is Venue => Boolean(venue));

  return (
    <Page title={tr("compareTitle")} intro={tr("compareIntro")} wide
      actions={venues.length > 0 ? (
        <Button variant="secondary" icon={Share2} onClick={async () => {
          const outcome = await shareLink({ title: tr("compareTitle"), url: absoluteUrl(comparePath(ids)) });
          setStatus(outcome === "copied" ? tr("shareCopied") : outcome === "failed" ? tr("shareFailed") : "");
        }}>{tr("compareShare")}</Button>
      ) : undefined}>
      <p role="status" className={styles.status}>{status}</p>
      {missing > 0 && <p className={styles.status}>{tr("compareMissing")}</p>}
      {ids.length < 3 && (
        <div className={styles.add}>
          <SearchField label={tr("compareAddLabel")} placeholder={tr("compareAddPlaceholder")} value={query} onValueChange={setQuery}
            groups={[{ id: "gyms", label: tr("groupGyms"), options }]} emptyText={tr("searchEmpty")}
            countText={(n) => tr("searchSuggestions", { n })}
            onSelect={(option) => { update([...venues.map((venue) => venue.id), option.id].slice(0, 3)); setQuery(""); }} />
        </div>
      )}
      {venues.length === 0 ? (
        <EmptyState photo="boxing-room" level={2} title={tr("compareEmptyTitle")} action={<Link to="/search" className={buttonClassName("primary")}>{tr("compareBrowse")}</Link>}>
          {tr("compareEmptyBody")}
        </EmptyState>
      ) : (
        <>
          {!wide && venues.length > 2 && (
            <div className={styles.pickers}>
              {[0, 1].map((slot) => (
                <label key={slot} className={styles.picker}>
                  <span className="sr-only">{tr("compareColumn", { n: slot + 1 })}</span>
                  <select value={pair[slot]} onChange={(event) => setPair((old) => (slot === 0 ? [Number(event.target.value), old[1]] : [old[0], Number(event.target.value)]))}>
                    {venues.map((venue, at) => <option key={venue.id} value={at} disabled={at === pair[1 - slot]}>{venue.name}</option>)}
                  </select>
                </label>
              ))}
            </div>
          )}
          <CompareTable venues={shown} onRemove={(venue) => { update(venues.map((item) => item.id).filter((id) => id !== venue.id)); setPair([0, 1]); }} />
        </>
      )}
    </Page>
  );
}
