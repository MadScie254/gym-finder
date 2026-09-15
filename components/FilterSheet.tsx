"use client";

import { RADIUS_OPTIONS } from "@/lib/types";
import type { Budget, GymFilters } from "@/lib/types";

type FilterSheetProps = {
  filters: GymFilters;
  onChange: (filters: GymFilters) => void;
  onClose: () => void;
};

const PRICE_OPTIONS: { id: Budget; label: string }[] = [
  { id: "any", label: "Any" },
  { id: "free", label: "Free" },
  { id: "low", label: "Budget" },
  { id: "mid", label: "Mid" },
  { id: "high", label: "Premium" },
];

export default function FilterSheet({ filters, onChange, onClose }: FilterSheetProps) {
  return (
    <div className="sheet-form">
      <header className="sheet-form__head">
        <div>
          <p className="eyebrow">Refine</p>
          <h2>Filters</h2>
        </div>
        <button type="button" className="ghost-btn" onClick={onClose}>
          Done
        </button>
      </header>

      <label className="toggle-row">
        <span>Open now</span>
        <input
          type="checkbox"
          checked={filters.openNow}
          onChange={(event) => onChange({ ...filters, openNow: event.target.checked })}
        />
      </label>

      <section>
        <h3>Price</h3>
        <div className="pill-row">
          {PRICE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`pill ${filters.price === option.id ? "is-on" : ""}`}
              onClick={() => onChange({ ...filters, price: option.id })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>Radius</h3>
        <div className="pill-row">
          {RADIUS_OPTIONS.map((option) => (
            <button
              key={option.meters}
              type="button"
              className={`pill ${filters.radiusMeters === option.meters ? "is-on" : ""}`}
              onClick={() => onChange({ ...filters, radiusMeters: option.meters })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
