import { Link } from "react-router";
import type { LatLng, Venue } from "../../data/types";
import { directionsUrl, formatDistance, safeExternalUrl, safeTelephoneUrl, safeWhatsAppUrl, walkMinutes } from "../../lib/format";
import { parseHours } from "../../lib/hours";
import { haversineKm } from "../../lib/kenya";
import { t, type Lang } from "../../lib/i18n";
import { osmEditUrl, reportHref, websiteHref } from "../../lib/report";
import { TrustBadge } from "../../ui/TrustBadge";
import { kindLabel } from "../results/ResultCard";

export function Detail({ venue, lang, origin }: { venue: Venue; lang: Lang; origin: LatLng | null }) {
  const km = origin ? haversineKm(origin, { lat: venue.lat, lng: venue.lng }) : null;
  const hours = parseHours(venue.hours?.raw);
  const tel = safeTelephoneUrl(venue.phones[0] ?? null);
  const wa = safeWhatsAppUrl(venue.whatsapp, `Hi, is ${venue.name} open today and what is the day-pass price? Found you on Find My Gym.`);
  const site = websiteHref(venue);
  const instagram = safeExternalUrl(venue.instagram);
  const report = reportHref(venue, "wrong details");
  const place = [venue.area, venue.town, venue.county].filter(Boolean).join(", ");
  return (
    <article className="detail">
      <Link className="back" to="/">Back to list</Link>
      <p className="meta"><span className="kind">{kindLabel(venue.kind)}</span></p>
      <h1>{venue.name}</h1>
      <p className="place">{place || "Area not listed"}</p>
      {km != null && <p className="tabular">{formatDistance(km)} · ~{walkMinutes(km)} min walk, straight line</p>}
      <TrustBadge tier={venue.trust.tier} />
      <p className="note">{venue.trust.reasons.join(" ")}</p>
      <dl className="facts">
        <div>
          <dt>Address</dt>
          <dd>{venue.address ?? t(lang, "addressMissing")}</dd>
        </div>
        <div>
          <dt>Hours</dt>
          <dd>{venue.hours ? `${hours.label}. ${venue.hours.raw}` : t(lang, "hoursMissing")}</dd>
        </div>
        {venue.fee === "free" && (
          <div>
            <dt>Fee</dt>
            <dd>Mapped as free.</dd>
          </div>
        )}
      </dl>
      <div className="action-bar">
        <a className="btn btn--wide" href={directionsUrl(venue.lat, venue.lng)}>{t(lang, "directions")}</a>
        {tel && <a className="btn" href={tel}>{t(lang, "call")}</a>}
        {wa && <a className="btn" href={wa}>{t(lang, "whatsapp")}</a>}
        {site && <a className="btn btn--ghost" href={site}>{t(lang, "website")}</a>}
        {instagram && <a className="btn btn--ghost" href={instagram}>Instagram</a>}
      </div>
      {!tel && !wa && !site && <p className="note">{t(lang, "noContact")}</p>}
      <section className="sources">
        <h2>Sources</h2>
        <ul>
          {venue.trust.sources.map((source) => <li key={source}>{source}</li>)}
          {venue.trust.lastSeen && <li>Last seen {venue.trust.lastSeen.slice(0, 10)}</li>}
          {venue.trust.stale && <li>May be outdated</li>}
        </ul>
        <p>
          {report ? <a href={report}>{t(lang, "report")}</a> : t(lang, "report")}
          {" · "}
          <a href={osmEditUrl(venue)}>Edit on OpenStreetMap</a>
        </p>
      </section>
    </article>
  );
}
