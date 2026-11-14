import { useT, useVenueContext } from "../../app/venue-context";
import type { Venue } from "../../data/types";
import { safeExternalUrl } from "../../lib/format";
import { formatDate, type CopyKey } from "../../lib/i18n";
import { osmEditUrl } from "../../lib/report";
import styles from "./GymDetail.module.css";

const SOURCE: Record<string, CopyKey> = { osm: "source_osm", overture: "source_overture" };
const CHECKED: Record<NonNullable<Venue["verification"]>["method"], CopyKey> = {
  website: "sourceCheckedWebsite",
  phone: "sourceCheckedPhone",
  visit: "sourceCheckedVisit",
};

/** "prices.dayPass" reads "Day pass", "amenities.sauna" reads "Sauna". */
function fieldLabel(field: string, tr: (key: CopyKey) => string): string {
  const [group, item] = field.split(".");
  if (group === "prices" && item) return tr(item === "monthly" ? "pricemonth" : "priceday");
  if (group === "amenities" && item) return tr(`amenity_${item}` as CopyKey);
  const key = `field_${group}` as CopyKey;
  return tr(key);
}

/** Where every fact came from, closed by default. Evidence quotes link to the page they were read on. */
export function DetailSources({ venue }: { venue: Venue }) {
  const tr = useT();
  const { lang } = useVenueContext();
  const evidence = Object.entries(venue.verification?.evidence ?? {});
  const osm = safeExternalUrl(venue.osmUrl);

  return (
    <details className={styles.sources}>
      <summary className={styles.summary}>{tr("detailSources")}</summary>
      <ul className={styles.sourceList}>
        {venue.trust.sources.map((source) => <li key={source}>{SOURCE[source] ? tr(SOURCE[source]) : source}</li>)}
        {venue.verification && <li>{tr(CHECKED[venue.verification.method], { date: formatDate(lang, venue.verification.checkedAt) })}</li>}
        {venue.trust.lastSeen && <li>{tr("sourceLastSeen", { date: formatDate(lang, venue.trust.lastSeen) })}</li>}
        {venue.trust.stale && <li>{tr("sourceStale")}</li>}
      </ul>
      {evidence.length > 0 && (
        <>
          <h3 className={styles.subheading}>{tr("sourceEvidence")}</h3>
          <dl className={styles.evidence}>
            {evidence.map(([field, row]) => {
              const url = safeExternalUrl(row.url);
              return (
                <div key={field}>
                  <dt>{fieldLabel(field, tr)}</dt>
                  <dd>
                    <q>{row.quote}</q>{" "}
                    {url && <a href={url} target="_blank" rel="noopener noreferrer">{new URL(url).hostname.replace(/^www\./, "")}</a>}
                  </dd>
                </div>
              );
            })}
          </dl>
        </>
      )}
      <p className={styles.osm}>
        {osm && <><a href={osm} target="_blank" rel="noopener noreferrer">{tr("openOsm")}</a>{" "}</>}
        <a href={osmEditUrl(venue)} target="_blank" rel="noopener noreferrer">{tr("editOsm")}</a>
      </p>
    </details>
  );
}
