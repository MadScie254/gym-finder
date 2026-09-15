"use client";

import { RADIUS_OPTIONS } from "@/lib/types";
import type { Budget, GymFilters } from "@/lib/types";

type FilterSheetProps = {
  filters: GymFilters;
  onChange: (filters: GymFilters) => void;
  onClose: () => void;
};

const RATING_OPTIONS = [0, 3.5, 4, 4.5];
const PRICE_OPTIONS: { id: Budget; label: string }[] = [
  { id: "any", label: "Any" },
  { id: "free", label: "Free" },
  { id: "low", label: "Budget" },
  { id: "mid", label: "Mid" },
  { id: "high", label: "Premium" },
];

export default function FilterSheet({ filters, onChange, onClose }: FilterSheetProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Filters</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-200"
        >
          Done
        </button>
      </div>

      <label className="mt-6 flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
        <span className="text-sm text-white">Open now</span>
        <input
          type="checkbox"
          checked={filters.openNow}
          onChange={(event) => onChange({ ...filters, openNow: event.target.checked })}
          className="h-5 w-5 accent-lime-300"
        />
      </label>

      <section className="mt-5">
        <h3 className="text-sm font-semibold text-slate-300">Minimum rating</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {RATING_OPTIONS.map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => onChange({ ...filters, minRating: rating })}
              className={`rounded-full px-3 py-2 text-sm ${
                filters.minRating === rating
                  ? "bg-lime-300 text-black"
                  : "bg-white/10 text-slate-200"
              }`}
            >
              {rating === 0 ? "Any" : `${rating}+`}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h3 className="text-sm font-semibold text-slate-300">Price</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRICE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange({ ...filters, price: option.id })}
              className={`rounded-full px-3 py-2 text-sm ${
                filters.price === option.id
                  ? "bg-lime-300 text-black"
                  : "bg-white/10 text-slate-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h3 className="text-sm font-semibold text-slate-300">Search radius</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map((option) => (
            <button
              key={option.meters}
              type="button"
              onClick={() => onChange({ ...filters, radiusMeters: option.meters })}
              className={`rounded-full px-3 py-2 text-sm ${
                filters.radiusMeters === option.meters
                  ? "bg-lime-300 text-black"
                  : "bg-white/10 text-slate-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
