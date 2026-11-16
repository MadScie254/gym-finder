import { Check, ExternalLink } from "lucide-react";
import type { AmenityKey, Venue, VenuePrice } from "../../data/types";
import { safeExternalUrl } from "../../lib/format";
import type { OpenState } from "../../lib/hours";
import { formatDate, t, type Lang } from "../../lib/i18n";
import styles from "./Detail.module.css";

const AMENITIES: AmenityKey[] = ["weights", "classes", "pool", "sauna", "showers", "parking", "wheelchair", "women_only"];

export function hoursState(hours: OpenState, lang: Lang): string | null {
  if (hours.state === "open") return hours.allDay ? t(lang, "hoursAllDay") : t(lang, "hoursOpenCloses", { time: hours.closes ?? "" });
  if (hours.state === "closed") return t(lang, "hoursClosed");
  return null;
}

/** A price as written on the gym's own page, its period, its date, and a link to that page. Never one without the other. */
function Price({ price, lang }: { price: VenuePrice; lang: Lang }) {
  const source = safeExternalUrl(price.sourceUrl);
  if (!source) return null;
  const period = t(lang, price.period === "day" ? "priceday" : "pricemonth");
  return (
    <div>
      <dt>{period}</dt>
      <dd>
        <strong className={styles.amount}>{price.text}</strong>
        <small>
          {price.asOf ? t(lang, "priceAsOf", { date: formatDate(lang, price.asOf) }) : t(lang, "priceUndated")}
          {price.note ? `. ${price.note}` : ""}.{" "}
          <a href={source} target="_blank" rel="noopener noreferrer" aria-label={t(lang, "priceSourceLabel", { period: period.toLowerCase() })}>
            {t(lang, "priceSource")}<ExternalLink aria-hidden="true" size={13} className={styles.inline} />
          </a>
        </small>
      </dd>
    </div>
  );
}

/** Facilities and access, only those the gym's own page or the map data names. */
export function Facilities({ venue, lang }: { venue: Venue; lang: Lang }) {
  const known = AMENITIES.filter((key) => venue.amenities[key]);
  if (known.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="detail-amenities">
      <h2 id="detail-amenities">{t(lang, "detailAmenities")}</h2>
      <ul className={styles.amenities} role="list">
        {known.map((key) => <li key={key}><Check aria-hidden="true" size={18} strokeWidth={2.5} />{t(lang, `amenity_${key}`)}</li>)}
      </ul>
    </section>
  );
}

/** Hours, price and address: what to know before travelling. Unknown says "Not listed". */
export function DetailFacts({ venue, hours, lang }: { venue: Venue; hours: OpenState; lang: Lang }) {
  const state = hoursState(hours, lang);
  const text = venue.hours?.text || venue.hours?.raw || null;
  const prices = [venue.prices?.dayPass, venue.prices?.monthly].filter((price): price is VenuePrice => Boolean(price));
  return (
    <section className={styles.section} aria-labelledby="detail-facts">
      <h2 id="detail-facts">{t(lang, "beforeYouGo")}</h2>
      <dl className={styles.facts}>
        <div>
          <dt>{t(lang, "detailHours")}</dt>
          <dd>
            {state && <strong className={styles.openState} data-state={hours.state}>{state}. </strong>}
            {text ?? t(lang, "hoursMissing")}
            {text && hours.state === "unknown" && <small>{t(lang, "hoursUnparsed")}</small>}
          </dd>
        </div>
        {prices.map((price) => <Price key={price.period} price={price} lang={lang} />)}
        {prices.length === 0 && venue.fee !== "free" && <div><dt>{t(lang, "priceLabel")}</dt><dd>{t(lang, "notListed")}</dd></div>}
        {venue.fee === "free" && <div><dt>{t(lang, "priceLabel")}</dt><dd>{t(lang, "feeFree")}</dd></div>}
        <div><dt>{t(lang, "detailAddress")}</dt><dd>{venue.address ?? t(lang, "addressMissing")}</dd></div>
      </dl>
      <p className={styles.note}>{t(lang, "confirmBeforeTravel")}</p>
    </section>
  );
}
