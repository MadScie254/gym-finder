import { Link } from "react-router";
import type { LatLng, Venue, VenueKind } from "../../data/types";
import { formatDistance, safeTelephoneUrl, safeWhatsAppUrl, walkMinutes } from "../../lib/format";
import { haversineKm } from "../../lib/kenya";
import { TrustBadge } from "../../ui/TrustBadge";

const KIND: Record<VenueKind, string> = {
  gym: "Gym",
  crossfit: "CrossFit",
  yoga: "Yoga",
  pilates: "Pilates",
  martial_arts: "Martial arts",
  boxing: "Boxing",
  gymnastics: "Gymnastics",
  boot_camp: "Boot camp",
};

export function kindLabel(kind: VenueKind): string {
  return KIND[kind];
}

export function ResultCard({
  venue,
  origin,
  selected,
  saved,
  onSave,
}: {
  venue: Venue;
  origin: LatLng | null;
  selected: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  const km = origin ? haversineKm(origin, { lat: venue.lat, lng: venue.lng }) : null;
  const tel = safeTelephoneUrl(venue.phones[0] ?? null);
  const wa = safeWhatsAppUrl(venue.whatsapp, `Hi, is ${venue.name} open today and what is the day-pass price? Found you on Find My Gym.`);
  const place = [venue.area, venue.county].filter(Boolean).join(", ");
  return (
    <article className={`result-card${selected ? " result-card--selected" : ""}`}>
      <Link to={`/gym/${venue.slug}`}>
        <h2>{venue.name}</h2>
        <p className="meta">
          <span className="kind">{kindLabel(venue.kind)}</span>
          {place && <span>{place}</span>}
        </p>
        {km != null && <p className="tabular">{formatDistance(km)} · ~{walkMinutes(km)} min walk</p>}
        <TrustBadge tier={venue.trust.tier} />
      </Link>
      <div className="result-card__actions">
        {tel && <a className="icon-btn" href={tel}>Call</a>}
        {wa && <a className="icon-btn" href={wa}>Chat</a>}
        <button type="button" className="icon-btn" onClick={onSave} aria-pressed={saved}>{saved ? "Saved" : "Save"}</button>
      </div>
    </article>
  );
}
