"use client";

import { gymCover } from "@/lib/cover";
import { directionsUrl, formatDistance, formatPrice, safeExternalUrl, safeTelephoneUrl } from "@/lib/format";
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
  const cover = gymCover(gym.name);
  const mapsLink = gym.googleMapsUri ?? directionsUrl(gym.location.lat, gym.location.lng, gym.name);
  const websiteUrl = safeExternalUrl(gym.website);
  const telephoneUrl = safeTelephoneUrl(gym.phone);

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

      <div
        className="detail__hero"
        style={{ background: `linear-gradient(145deg, ${cover.from} 0%, ${cover.to} 55%, #0a0c0b 100%)` }}
      >
        <p className="eyebrow">Mapped live</p>
        <h2 className="detail__title">{gym.name}</h2>
        {gym.distanceKm != null && (
          <p className="detail__metric">{formatDistance(gym.distanceKm)} from you</p>
        )}
      </div>

      <p className="detail__addr">{gym.address}</p>
      {gym.editorialSummary && <p className="detail__sum">{gym.editorialSummary}</p>}
      {loadingDetails && <div className="loading-bar" aria-label="Loading details" />}

      <div className="meta-row">
          {gym.openNow != null && (
            <span className={gym.openNow ? "chip chip--live" : "chip"}>
              {gym.openNow ? "Open 24/7" : "Hours unavailable"}
            </span>
        )}
        {formatPrice(gym.priceLevel) && <span className="chip">{formatPrice(gym.priceLevel)}</span>}
        {gym.types.slice(0, 3).map((type) => (
          <span key={type} className="chip">
            {type.replaceAll("_", " ")}
          </span>
        ))}
      </div>

      <div className="cta-row">
        <a href={mapsLink} target="_blank" rel="noreferrer" className="primary-btn">
          Directions
        </a>
        {telephoneUrl ? (
          <a href={telephoneUrl} className="secondary-btn">
            Call
          </a>
        ) : (
          <span className="secondary-btn is-disabled">No phone</span>
        )}
      </div>

      {websiteUrl && (
        <a href={websiteUrl} target="_blank" rel="noreferrer" className="secondary-btn wide">
          Website
        </a>
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
