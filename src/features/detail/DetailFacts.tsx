import { Check, ExternalLink } from "lucide-react";
import { useT, useVenueContext } from "../../app/venue-context";
import type { AmenityKey, Venue, VenuePrice } from "../../data/types";
import { safeExternalUrl } from "../../lib/format";
import type { OpenState } from "../../lib/hours";
import { formatDate, type Translate } from "../../lib/i18n";
import styles from "./GymDetail.module.css";

const AMENITIES: AmenityKey[] = ["weights", "classes", "pool", "sauna", "showers", "parking", "wheelchair", "women_only"];

export function hoursLine(hours: OpenState, tr: Translate): string | null {
  if (hours.state === "open") return hours.allDay ? tr("hoursAllDay") : tr("hoursOpenCloses", { time: hours.closes ?? "" });
  if (hours.state === "closed") return tr("hoursClosed");
  return null;
}

/** "KES 1,200" from the amount, so the number reads the same on every gym. */
function amount(price: VenuePrice): string {
  return `${price.currency} ${new Intl.NumberFormat("en-KE").format(price.amount)}`;
}

function PriceRow({ price }: { price: VenuePrice }) {
  const tr = useT();
  const { lang } = useVenueContext();
  const source = safeExternalUrl(price.sourceUrl);
  // A price is never shown without its source (plan G4).
  if (!source) return null;
  const period = tr(`price${price.period}` as const);
  return (
    <li className={styles.price}>
      <span className={styles.priceKind}>{period}</span>
      <span className={styles.priceAmount}>{amount(price)}</span>
      <span className={styles.priceMeta}>
        {price.asOf ? tr("priceAsOf", { date: formatDate(lang, price.asOf) }) : tr("priceUndated")}
        {price.note ? `. ${price.note}` : ""}
        {". "}
        <a href={source} target="_blank" rel="noopener noreferrer" aria-label={tr("priceSourceLabel", { period: period.toLowerCase() })}>
          {tr("priceSource")}<ExternalLink aria-hidden="true" size={14} className={styles.inlineIcon} />
        </a>
      </span>
    </li>
  );
}

/** Address, hours, prices and facilities: each shown only as far as the data goes. */
export function DetailFacts({ venue, hours }: { venue: Venue; hours: OpenState }) {
  const tr = useT();
  const state = hoursLine(hours, tr);
  const hoursText = venue.hours?.text ?? venue.hours?.raw;
  const prices = [venue.prices?.dayPass, venue.prices?.monthly].filter((price): price is VenuePrice => Boolean(price));
  const amenities = AMENITIES.filter((key) => venue.amenities[key]);

  return (
    <>
      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>{tr("detailAddress")}</dt>
          <dd>{venue.address ?? <span className={styles.missing}>{tr("addressMissing")}</span>}</dd>
        </div>
        <div className={styles.fact}>
          <dt>{tr("detailHours")}</dt>
          <dd>
            {!hoursText && <span className={styles.missing}>{tr("hoursMissing")}</span>}
            {state && <strong className={styles.openState} data-state={hours.state}>{state}</strong>}
            {hoursText && <span className={styles.hoursText}>{hoursText}</span>}
            {hoursText && hours.state === "unknown" && <span className={styles.missing}>{tr("hoursUnparsed")}</span>}
          </dd>
        </div>
        {venue.fee === "free" && (
          <div className={styles.fact}>
            <dt>{tr("detailPrices")}</dt>
            <dd>{tr("feeFree")}</dd>
          </div>
        )}
      </dl>
      {prices.length > 0 && (
        <section className={styles.section} aria-labelledby="gym-prices">
          <h2 id="gym-prices" className={styles.heading}>{tr("detailPrices")}</h2>
          <ul className={styles.prices} role="list">
            {prices.map((price) => <PriceRow key={price.period} price={price} />)}
          </ul>
        </section>
      )}
      {amenities.length > 0 && (
        <section className={styles.section} aria-labelledby="gym-amenities">
          <h2 id="gym-amenities" className={styles.heading}>{tr("detailAmenities")}</h2>
          <ul className={styles.amenities} role="list">
            {amenities.map((key) => (
              <li key={key}><Check aria-hidden="true" size={18} strokeWidth={2.5} />{tr(`amenity_${key}` as const)}</li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
