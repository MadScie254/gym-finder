import type { ReactNode } from "react";
import { Link } from "react-router";
import { useT, useVenueContext } from "../../app/venue-context";
import type { AmenityKey, Venue } from "../../data/types";
import { formatDistance, safeExternalUrl, safeTelephoneUrl, safeWhatsAppUrl } from "../../lib/format";
import { parseHours } from "../../lib/hours";
import type { CopyKey } from "../../lib/i18n";
import { haversineKm } from "../../lib/kenya";
import { X } from "lucide-react";
import { IconButton, TrustBadge } from "../../ui";
import { hoursState } from "../detail/DetailFacts";
import { placeOf } from "../results/ResultCard";
import styles from "./Compare.module.css";

type Row = { key: CopyKey; cell: (venue: Venue) => ReactNode };

/** Facts aligned row by row. Missing is "Not listed"; there is no score and no "best match". */
export function CompareTable({ venues, onRemove }: { venues: Venue[]; onRemove: (venue: Venue) => void }) {
  const tr = useT();
  const { origin, lang } = useVenueContext();
  const none = <span className={styles.missing}>{tr("notListed")}</span>;
  const rows: Row[] = [
    { key: "rowArea", cell: (venue) => placeOf(venue, lang) },
    ...(origin ? [{ key: "rowDistance" as const, cell: (venue: Venue) => formatDistance(haversineKm(origin, venue)) }] : []),
    { key: "rowTrust", cell: (venue) => <TrustBadge tier={venue.trust.tier} word={tr(`trust_${venue.trust.tier}`)} /> },
    { key: "rowHours", cell: (venue) => {
      const text = venue.hours?.text ?? venue.hours?.raw;
      const state = hoursState(parseHours(venue.hours?.raw), lang);
      return text ? <>{state && <strong>{state}. </strong>}{text}</> : none;
    } },
    { key: "rowDayPass", cell: (venue) => price(venue, "dayPass") ?? none },
    { key: "rowMonthly", cell: (venue) => price(venue, "monthly") ?? none },
    { key: "rowPhone", cell: (venue) => { const tel = safeTelephoneUrl(venue.phones[0]); return tel ? <a href={tel}>{venue.phones[0]}</a> : none; } },
    { key: "rowWhatsApp", cell: (venue) => { const wa = safeWhatsAppUrl(venue.whatsapp, tr("whatsappMessage", { name: venue.name })); return wa ? <a href={wa} target="_blank" rel="noopener noreferrer">{tr("actionWhatsApp")}</a> : none; } },
    { key: "rowWebsite", cell: (venue) => { const site = safeExternalUrl(venue.website); return site ? <a href={site} target="_blank" rel="noopener noreferrer">{new URL(site).hostname.replace(/^www\./, "")}</a> : none; } },
    { key: "rowAmenities", cell: (venue) => {
      const known = (Object.keys(venue.amenities) as AmenityKey[]).filter((key) => venue.amenities[key]);
      return known.length ? known.map((key) => tr(`amenity_${key}`)).join(", ") : none;
    } },
  ];

  function price(venue: Venue, which: "dayPass" | "monthly") {
    const value = venue.prices?.[which];
    const source = safeExternalUrl(value?.sourceUrl);
    if (!value || !source) return null;
    return <>{value.text} <a href={source} target="_blank" rel="noopener noreferrer">{tr("priceSource")}</a></>;
  }

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <td />
            {venues.map((venue) => (
              <th key={venue.id} scope="col">
                <span className={styles.colHead}>
                  <Link to={`/gym/${venue.slug}`}>{venue.name}</Link>
                  <IconButton icon={X} variant="quiet" label={tr("compareRemove", { name: venue.name })} onClick={() => onRemove(venue)} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{tr(row.key)}</th>
              {venues.map((venue) => <td key={venue.id}>{row.cell(venue)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
