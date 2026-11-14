import type { Venue } from "../../data/types";
import { safeExternalUrl } from "../../lib/format";
import { formatDate, t, type CopyKey, type Lang } from "../../lib/i18n";
import { osmEditUrl } from "../../lib/report";
import styles from "./Detail.module.css";

const SOURCE: Record<string, CopyKey> = { osm: "source_osm", overture: "source_overture" };
const CHECKED: Record<NonNullable<Venue["verification"]>["method"], CopyKey> = {
  website: "sourceCheckedWebsite",
  phone: "sourceCheckedPhone",
  visit: "sourceCheckedVisit",
};
const FIELDS = new Set(["operating", "address", "phone", "hours", "website", "whatsapp"]);

/** "prices.dayPass" reads "Day pass", "amenities.sauna" reads "Sauna". */
function fieldLabel(field: string, lang: Lang): string {
  const [group, item] = field.split(".");
  if (group === "prices") return t(lang, item === "monthly" ? "pricemonth" : "priceday");
  if (group === "amenities" && item) return t(lang, `amenity_${item}` as CopyKey);
  return FIELDS.has(group) ? t(lang, `field_${group}` as CopyKey) : group;
}

/** Where every fact came from, closed by default, with the way to correct it. */
export function DetailSources({ venue, lang }: { venue: Venue; lang: Lang }) {
  const evidence = Object.entries(venue.verification?.evidence ?? {});
  const osm = safeExternalUrl(venue.osmUrl);
  return (
    <section className={styles.section} aria-labelledby="detail-sources">
      <details className={styles.sources}>
        <summary className={styles.summaryToggle}><h2 id="detail-sources">{t(lang, "detailSources")}</h2></summary>
        <ul>
          {venue.trust.sources.map((source) => <li key={source}>{SOURCE[source] ? t(lang, SOURCE[source]) : source}</li>)}
          {venue.verification && <li>{t(lang, CHECKED[venue.verification.method], { date: formatDate(lang, venue.verification.checkedAt) })}</li>}
          {venue.trust.lastSeen && <li>{t(lang, "sourceLastSeen", { date: formatDate(lang, venue.trust.lastSeen) })}</li>}
          {venue.trust.stale && <li>{t(lang, "sourceStale")}</li>}
        </ul>
        {evidence.length > 0 && (
          <>
            <h3 className={styles.subheading}>{t(lang, "sourceEvidence")}</h3>
            <dl className={styles.evidence}>
              {evidence.map(([field, row]) => {
                const url = safeExternalUrl(row.url);
                return (
                  <div key={field}>
                    <dt>{fieldLabel(field, lang)}</dt>
                    <dd><q>{row.quote}</q>{url && <> <a href={url} target="_blank" rel="noopener noreferrer">{new URL(url).hostname.replace(/^www\./, "")}</a></>}</dd>
                  </div>
                );
              })}
            </dl>
          </>
        )}
      </details>
      <p className={styles.links}>
        <a href={osmEditUrl(venue)} target="_blank" rel="noopener noreferrer">{t(lang, "suggestOsm")}</a>
        {osm && <> <a href={osm} target="_blank" rel="noopener noreferrer">{t(lang, "openOsm")}</a></>}
      </p>
    </section>
  );
}
