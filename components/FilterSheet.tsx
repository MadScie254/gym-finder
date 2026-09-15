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
  { id: "free", label: "Mapped as free" },
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
        <span>Open 24/7</span>
        <input
          type="checkbox"
          checked={filters.openNow}
          onChange={(event) => onChange({ ...filters, openNow: event.target.checked })}
        />
      </label>

      <section>
        <h3>Fee information</h3>
        <div className="pill-row">
          {PRICE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`pill ${filters.price === option.id ? "is-on" : ""}`}
              aria-pressed={filters.price === option.id}
              onClick={() => onChange({ ...filters, price: option.id })}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="notice">Most OpenStreetMap venues do not publish membership prices.</p>
      </section>

      <section>
        <h3>Radius</h3>
        <div className="pill-row">
          {RADIUS_OPTIONS.map((option) => (
            <button
              key={option.meters}
              type="button"
              className={`pill ${filters.radiusMeters === option.meters ? "is-on" : ""}`}
              aria-pressed={filters.radiusMeters === option.meters}
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
