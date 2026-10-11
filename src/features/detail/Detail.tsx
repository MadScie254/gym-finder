import { Link } from "react-router";
import type { LatLng, Venue } from "../../data/types";
import { directionsUrl, formatDistance, geoUrl, safeExternalUrl, safeTelephoneUrl, safeWhatsAppUrl, walkMinutes } from "../../lib/format";
import { parseHours } from "../../lib/hours";
import { haversineKm } from "../../lib/kenya";
import { t, type Lang } from "../../lib/i18n";
import { osmEditUrl, reportHref, websiteHref } from "../../lib/report";
import { TrustBadge } from "../../ui/TrustBadge";

export function Detail({ venue, lang, origin }: { venue: Venue; lang: Lang; origin: LatLng | null }) {
  const km = origin ? haversineKm(origin, { lat: venue.lat, lng: venue.lng }) : null;
  const hours = parseHours(venue.hours?.raw);
  const tel = safeTelephoneUrl(venue.phones[0] ?? null);
  const wa = safeWhatsAppUrl(venue.whatsapp, `Hi, is ${venue.name} open today and what is the day-pass price? Found you on Find My Gym.`);
  const site = websiteHref(venue);
  const instagram = safeExternalUrl(venue.instagram);
  const report = reportHref(venue, "wrong details");
  const place = [venue.area, venue.town, venue.county].filter(Boolean).join(" · ");
  return (
    <article className="detail">
      <p><Link to="/">Back</Link></p>
      <h1>{venue.name}</h1>
      <p className="muted">{venue.kind}{place ? ` · ${place}` : ""}</p>
      {km != null && <p className="tabular">{formatDistance(km)} · ~{walkMinutes(km)} min walk (straight-line estimate)</p>}
      <TrustBadge tier={venue.trust.tier} reasons={venue.trust.reasons} lang={lang} verifiedAt={venue.trust.verifiedAt} />
      <p>{venue.address ?? t(lang, "addressMissing")}</p>
      <p>{venue.hours ? `${hours.label} · ${venue.hours.raw}` : t(lang, "hoursMissing")}</p>
      {venue.fee === "free" && <p>Mapped as free.</p>}
      <div className="action-bar">
        {tel && <a className="btn" href={tel}>{t(lang, "call")}</a>}
        {wa && <a className="btn" href={wa}>{t(lang, "whatsapp")}</a>}
        <a className="btn" href={directionsUrl(venue.lat, venue.lng)}>{t(lang, "directions")}</a>
        <a className="btn btn--ghost" href={geoUrl(venue.lat, venue.lng)}>geo:</a>
        {site && <a className="btn btn--ghost" href={site}>{t(lang, "website")}</a>}
        {instagram && <a className="btn btn--ghost" href={instagram}>Instagram</a>}
      </div>
      {!tel && !wa && !site && <p>{t(lang, "noContact")}</p>}
      <h2>Sources</h2>
      <ul>
        {venue.trust.sources.map((source) => <li key={source}>{source}</li>)}
        {venue.trust.lastSeen && <li>Last seen {venue.trust.lastSeen.slice(0, 10)}</li>}
        {venue.trust.stale && <li>May be outdated</li>}
      </ul>
      <p>
        {report ? <a href={report}>{t(lang, "report")}</a> : <span>{t(lang, "report")} — support number not configured.</span>}
        {" · "}
        <a href={osmEditUrl(venue)}>Edit on OpenStreetMap</a>
      </p>
    </article>
  );
}
