"use client";

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
  const fit = gym.labels[0] ? labelText(gym.labels[0]) : null;
  const price = formatPrice(gym.priceLevel);
  const meta = [
    gym.distanceKm != null ? formatDistance(gym.distanceKm) : null,
    fit,
    price,
    gym.openNow ? "Open 24/7" : null,
  ].filter(Boolean);

  return (
    <article className={`gym-card ${selected ? "is-selected" : ""}`}>
      <button type="button" className="gym-card__hit" onClick={onSelect}>
        <span className="gym-card__rank" aria-hidden>
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="gym-card__body">
          <h3 className="gym-card__name">{gym.name}</h3>
          {meta.length > 0 && <p className="gym-card__meta">{meta.join(" · ")}</p>}
        </div>
      </button>
      <button
        type="button"
        className={`save-btn ${saved ? "is-on" : ""}`}
        aria-pressed={saved}
        aria-label={saved ? `Unsave ${gym.name}` : `Save ${gym.name}`}
        onClick={onToggleSave}
      >
        {saved ? "Saved" : "Save"}
      </button>
    </article>
  );
}
