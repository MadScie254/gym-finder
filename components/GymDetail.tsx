"use client";

import {
  directionsUrl,
  formatDistance,
  formatPrice,
  labelText,
  safeExternalUrl,
  safeTelephoneUrl,
} from "@/lib/format";
import type { Gym } from "@/lib/types";

type GymDetailProps = {
  gym: Gym;
  saved: boolean;
  loadingDetails: boolean;
  onClose: () => void;
  onToggleSave: () => void;
};

export default function GymDetail({
  gym,
  saved,
  loadingDetails,
  onClose,
  onToggleSave,
}: GymDetailProps) {
  const mapsLink = gym.googleMapsUri ?? directionsUrl(gym.location.lat, gym.location.lng, gym.name);
  const websiteUrl = safeExternalUrl(gym.website);
  const telephoneUrl = safeTelephoneUrl(gym.phone);
  const fit = gym.labels[0] ? labelText(gym.labels[0]) : null;
  const why = [
    gym.distanceKm != null ? `${formatDistance(gym.distanceKm)} from search point` : null,
    fit,
    formatPrice(gym.priceLevel),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="detail">
      <div className="detail__nav">
        <button type="button" className="ghost-btn" onClick={onClose}>
          Back
        </button>
        <button
          type="button"
          className={`save-btn ${saved ? "is-on" : ""}`}
          aria-pressed={saved}
          onClick={onToggleSave}
        >
          {saved ? "Saved" : "Save"}
        </button>
      </div>

      <header className="detail__head">
        <p className="eyebrow">Mapped live</p>
        <h2 className="detail__title">{gym.name}</h2>
        {why && <p className="detail__why">{why}</p>}
        <p className="detail__addr">{gym.address}</p>
      </header>

      {gym.editorialSummary && <p className="detail__sum">{gym.editorialSummary}</p>}
      {loadingDetails && <div className="loading-bar" aria-label="Loading details" />}

      <div className="cta-row">
        <a href={mapsLink} target="_blank" rel="noreferrer" className="primary-btn">
          Directions
        </a>
        {telephoneUrl ? (
          <a href={telephoneUrl} className="secondary-btn">
            Call
          </a>
        ) : null}
      </div>

      {websiteUrl && (
        <a href={websiteUrl} target="_blank" rel="noreferrer" className="secondary-btn wide">
          Website
        </a>
      )}

      {(gym.openNow != null || gym.types.length > 0) && (
        <div className="meta-row detail__tags">
          {gym.openNow != null && (
            <span className={gym.openNow ? "chip chip--live" : "chip"}>
              {gym.openNow ? "Open 24/7" : "Hours unavailable"}
            </span>
          )}
          {gym.types.slice(0, 3).map((type) => (
            <span key={type} className="chip">
              {type.replaceAll("_", " ")}
            </span>
          ))}
        </div>
      )}

      {gym.weekdayHours.length > 0 && (
        <section className="block">
          <h3>Hours</h3>
          <ul>
            {gym.weekdayHours.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
