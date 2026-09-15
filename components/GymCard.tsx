"use client";

import { gymCover, padIndex } from "@/lib/cover";
import { formatDistance, formatPrice, labelText } from "@/lib/format";
import type { Gym } from "@/lib/types";

type GymCardProps = {
  gym: Gym;
  index: number;
  selected: boolean;
  saved: boolean;
  onSelect: () => void;
  onToggleSave: () => void;
};

export default function GymCard({
  gym,
  index,
  selected,
  saved,
  onSelect,
  onToggleSave,
}: GymCardProps) {
  const cover = gymCover(gym.name);

  return (
    <article className={`gym-card ${selected ? "is-selected" : ""}`}>
      <button type="button" className="gym-card__hit" onClick={onSelect}>
        <span
          className="gym-card__index"
          style={{ background: `linear-gradient(145deg, ${cover.from}, ${cover.to})` }}
        >
          {padIndex(index)}
        </span>
        <div className="gym-card__body">
          <div className="gym-card__labels">
            {gym.labels.map((label) => (
              <span key={label} className="chip chip--gold">
                {labelText(label)}
              </span>
            ))}
            {gym.openNow ? <span className="chip chip--live">Open 24/7</span> : null}
            {formatPrice(gym.priceLevel) ? (
              <span className="chip">{formatPrice(gym.priceLevel)}</span>
            ) : null}
          </div>
          <h3 className="gym-card__name">{gym.name}</h3>
          <p className="gym-card__addr">{gym.address}</p>
        </div>
        <div className="gym-card__side">
          {gym.distanceKm != null && (
            <span className="gym-card__dist">{formatDistance(gym.distanceKm)}</span>
          )}
        </div>
      </button>
      <button
        type="button"
        className={`save-btn ${saved ? "is-on" : ""}`}
        aria-pressed={saved}
        onClick={onToggleSave}
      >
        {saved ? "Saved" : "Save"}
      </button>
    </article>
  );
}
