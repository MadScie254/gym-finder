import { useState } from "react";
import { ArrowLeft, Globe2, MapPinned, MessageCircle, Phone, Share2 } from "lucide-react";
import { Link } from "react-router";
import type { LatLng, Venue, VenuePrice } from "../../data/types";
import { directionsUrl, safeExternalUrl, safeTelephoneUrl, safeWhatsAppUrl } from "../../lib/format";
import { parseHours } from "../../lib/hours";
import { haversineKm } from "../../lib/kenya";
import { t, type Lang } from "../../lib/i18n";
import { osmEditUrl, reportHref, websiteHref } from "../../lib/report";
import { ActionRow, DistanceBlock, TrustBadge, type RowAction } from "../../ui";
import { kindLabel } from "../results/ResultCard";
import styles from "./Detail.module.css";

const AMENITIES: Record<string, string> = {
  weights: "Weights", classes: "Classes", pool: "Pool", sauna: "Sauna",
  showers: "Showers", parking: "Parking", wheelchair: "Wheelchair access", women_only: "Women-only space",
};

function PriceSource({ price }: { price: VenuePrice }) {
  const source = safeExternalUrl(price.sourceUrl);
  return <small>{price.asOf ? `As of ${price.asOf}. ` : ""}{source && <a href={source} target="_blank" rel="noopener noreferrer">Price source</a>}</small>;
}

export function Detail({ venue, lang, origin }: { venue: Venue; lang: Lang; origin: LatLng | null }) {
  const [shareStatus, setShareStatus] = useState("");
  const km = origin ? haversineKm(origin, { lat: venue.lat, lng: venue.lng }) : null;
  const hours = venue.hours?.raw ? parseHours(venue.hours.raw) : null;
  const tel = safeTelephoneUrl(venue.phones[0] ?? null);
  const wa = safeWhatsAppUrl(venue.whatsapp, `Hi, is ${venue.name} open today and what is the day-pass price? Found you on Find My Gym.`);
  const site = websiteHref(venue);
  const instagram = safeExternalUrl(venue.instagram);
  const report = reportHref(venue, "wrong details");
  const place = [venue.area, venue.town, venue.county].filter(Boolean).join(", ");
  const amenities = Object.entries(venue.amenities).filter(([, known]) => known).map(([key]) => AMENITIES[key] ?? key);

  async function share() {
    if (typeof window === "undefined") return;
    const url = new URL(`/gym/${venue.slug}`, window.location.origin).href;
    try {
      if (navigator.share) await navigator.share({ title: venue.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setShareStatus("Gym link copied.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareStatus("Could not share the link. Copy the page address instead.");
    }
  }

  const actions: RowAction[] = [
    { id: "directions", label: t(lang, "directions"), icon: MapPinned, href: directionsUrl(venue.lat, venue.lng), external: true },
    ...(tel ? [{ id: "call", label: t(lang, "call"), icon: Phone, href: tel } satisfies RowAction] : []),
    ...(wa ? [{ id: "chat", label: t(lang, "whatsapp"), icon: MessageCircle, href: wa, external: true } satisfies RowAction] : []),
    ...(site ? [{ id: "website", label: t(lang, "website"), icon: Globe2, href: site, external: true } satisfies RowAction] : []),
    { id: "share", label: "Share", icon: Share2, onClick: share },
  ];

  return (
    <article className={styles.detail}>
      <Link className={styles.back} to="/"><ArrowLeft size={18} aria-hidden="true" /> Back to gyms</Link>
      <header className={styles.header}>
        <div>
          <p className={styles.kind}>{kindLabel(venue.kind)}</p>
          <h1>{venue.name}</h1>
          <p className={styles.place}>{place || "Area not listed"}</p>
          <TrustBadge tier={venue.trust.tier} />
        </div>
        <DistanceBlock km={km} open={hours?.state === "open"} size="detail" />
      </header>
      <ActionRow actions={actions} label={`Actions for ${venue.name}`} />
      {shareStatus && <p role="status" className={styles.note}>{shareStatus}</p>}
      {!tel && !wa && !site && <p className={styles.note}>{t(lang, "noContact")}</p>}

      <section className={styles.section} aria-labelledby="detail-facts">
        <h2 id="detail-facts">Before you go</h2>
        <dl className={styles.facts}>
          <div><dt>Address</dt><dd>{venue.address ?? t(lang, "addressMissing")}</dd></div>
          <div><dt>Hours</dt><dd>{venue.hours?.text ?? (hours ? `${hours.label}. ${venue.hours?.raw}` : t(lang, "hoursMissing"))}</dd></div>
          {venue.fee === "free" && <div><dt>Fee</dt><dd>Mapped as free.</dd></div>}
          {venue.prices?.dayPass && <div><dt>Day pass</dt><dd>{venue.prices.dayPass.text}<PriceSource price={venue.prices.dayPass} /></dd></div>}
          {venue.prices?.monthly && <div><dt>Monthly</dt><dd>{venue.prices.monthly.text}<PriceSource price={venue.prices.monthly} /></dd></div>}
        </dl>
        {amenities.length > 0 && <p className={styles.note}>Listed facilities: {amenities.join(", ")}.</p>}
        <p className={styles.note}>Confirm hours, access and prices with the gym before travelling.</p>
      </section>

      <section className={styles.section} aria-labelledby="detail-sources">
        <h2 id="detail-sources">How we know</h2>
        <TrustBadge tier={venue.trust.tier} />
        {venue.trust.reasons.length > 0 && <ul>{venue.trust.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
        {venue.verification && <p className={styles.note}>{venue.verification.method === "website" ? "Checked on the gym's website" : venue.verification.method === "phone" ? "Checked by phone" : "Visited in person"} on {venue.verification.checkedAt.slice(0, 10)}.</p>}
        <p className={styles.note}>Sources: {venue.trust.sources.join(", ") || "Not listed"}{venue.trust.lastSeen ? ` · Last seen ${venue.trust.lastSeen.slice(0, 10)}` : ""}{venue.trust.stale ? " · May be outdated" : ""}</p>
        <p className={styles.links}>
          {report ? <a href={report}>Something wrong? Report a detail</a> : <a href={osmEditUrl(venue)}>Suggest a correction on OpenStreetMap</a>}
          {report && <> · <a href={osmEditUrl(venue)}>Edit on OpenStreetMap</a></>}
          {instagram && <> · <a href={instagram} target="_blank" rel="noopener noreferrer">Instagram</a></>}
        </p>
      </section>
    </article>
  );
}
