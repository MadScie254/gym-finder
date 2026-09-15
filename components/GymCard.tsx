"use client";

import { formatDistance, formatPrice, labelText, starText } from "@/lib/format";
import type { Gym } from "@/lib/types";

type GymCardProps = {
  gym: Gym;
  selected: boolean;
  saved: boolean;
  onSelect: () => void;
  onToggleSave: () => void;
};

export default function GymCard({
  gym,
  selected,
  saved,
  onSelect,
  onToggleSave,
}: GymCardProps) {
  return (
    <article
      className={`rounded-2xl border p-3 transition ${
        selected
          ? "border-lime-300 bg-white/10"
          : "border-white/10 bg-white/5 hover:border-white/20"
      }`}
    >
      <button type="button" className="w-full text-left" onClick={onSelect}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">{gym.name}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-slate-400">{gym.address}</p>
          </div>
          {gym.distanceKm != null && (
            <span className="shrink-0 rounded-full bg-black/40 px-2 py-1 text-xs text-lime-300">
              {formatDistance(gym.distanceKm)}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {gym.labels.map((label) => (
            <span
              key={label}
              className="rounded-full bg-lime-300/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-lime-300"
            >
              {labelText(label)}
            </span>
          ))}
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-200">
            {starText(gym.rating, gym.userRatingCount)}
          </span>
          {formatPrice(gym.priceLevel) && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-200">
              {formatPrice(gym.priceLevel)}
            </span>
          )}
          {gym.openNow != null && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] ${
                gym.openNow ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-slate-400"
              }`}
            >
              {gym.openNow ? "Open now" : "Closed"}
            </span>
          )}
        </div>
      </button>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onToggleSave}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            saved ? "bg-lime-300 text-black" : "bg-white/10 text-slate-200"
          }`}
        >
          {saved ? "Saved" : "Save"}
        </button>
      </div>
    </article>
  );
}
