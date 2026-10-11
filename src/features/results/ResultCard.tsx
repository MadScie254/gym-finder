import { Link } from "react-router";
import type { Venue } from "../../data/types";
import { formatDistance, safeTelephoneUrl, safeWhatsAppUrl, walkMinutes } from "../../lib/format";
import { parseHours } from "../../lib/hours";
import { haversineKm } from "../../lib/kenya";
import type { Lang } from "../../lib/i18n";
import { t } from "../../lib/i18n";
import { TrustBadge } from "../../ui/TrustBadge";
import type { LatLng } from "../../data/types";

export function ResultCard({
  venue,
  origin,
  lang,
  selected,
  saved,
  onSave,
}: {
  venue: Venue;
  origin: LatLng | null;
  lang: Lang;
  selected: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  const km = origin ? haversineKm(origin, { lat: venue.lat, lng: venue.lng }) : null;
  const hours = parseHours(venue.hours?.raw);
  const tel = safeTelephoneUrl(venue.phones[0] ?? null);
  const wa = safeWhatsAppUrl(venue.whatsapp, `Hi, is ${venue.name} open today and what is the day-pass price? Found you on Find My Gym.`);
  const place = [venue.area, venue.county].filter(Boolean).join(" · ");
  return (
    <article className={`result-card${selected ? " result-card--selected" : ""}`}>
      <Link to={`/gym/${venue.slug}`} className="result-card__main">
        <h2>{venue.name}</h2>
        <p className="muted">{place || venue.kind}</p>
        {km != null && <p className="tabular">{formatDistance(km)} · ~{walkMinutes(km)} min walk</p>}
        <p className="muted">{hours.label}</p>
        <TrustBadge tier={venue.trust.tier} reasons={venue.trust.reasons} lang={lang} verifiedAt={venue.trust.verifiedAt} />
      </Link>
      <div className="result-card__actions">
        {tel && <a className="icon-btn" href={tel}>{t(lang, "call")}</a>}
        {wa && <a className="icon-btn" href={wa}>{t(lang, "whatsapp")}</a>}
        <button type="button" className="icon-btn" onClick={onSave} aria-pressed={saved}>{saved ? "Saved" : "Save"}</button>
      </div>
    </article>
  );
}
