"use client";

import {
  AMENITY_OPTIONS,
  BUDGET_OPTIONS,
  GOAL_OPTIONS,
  type ClientProfile,
} from "@/lib/types";

type ProfileFormProps = {
  kicker?: string;
  title: string;
  subtitle: string;
  profile: ClientProfile;
  primaryLabel: string;
  secondaryLabel?: string;
  onChange: (profile: ClientProfile) => void;
  onSubmit: () => void;
  onSecondary?: () => void;
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function ProfileForm({
  kicker = "Your brief",
  title,
  subtitle,
  profile,
  primaryLabel,
  secondaryLabel,
  onChange,
  onSubmit,
  onSecondary,
}: ProfileFormProps) {
  return (
    <div className="sheet-form profile-form">
      <p className="eyebrow">{kicker}</p>
      <h2 className="display">{title}</h2>
      <p className="lede">{subtitle}</p>

      <section>
        <h3>Goals</h3>
        <div className="choice-grid">
          {GOAL_OPTIONS.map((option) => {
            const active = profile.goals.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                className={`choice ${active ? "is-on" : ""}`}
                onClick={() => onChange({ ...profile, goals: toggle(profile.goals, option.id) })}
              >
                <strong>{option.label}</strong>
                <span>{option.hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3>Budget</h3>
        <div className="pill-row">
          {BUDGET_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`pill ${profile.budget === option.id ? "is-on" : ""}`}
              onClick={() => onChange({ ...profile, budget: option.id })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>Amenities</h3>
        <div className="pill-row">
          {AMENITY_OPTIONS.map((option) => {
            const active = profile.amenities.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                className={`pill ${active ? "is-on" : ""}`}
                onClick={() =>
                  onChange({ ...profile, amenities: toggle(profile.amenities, option.id) })
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="form-actions">
        <button type="button" className="primary-btn" onClick={onSubmit}>
          {primaryLabel}
        </button>
        {secondaryLabel && onSecondary && (
          <button type="button" className="ghost-btn wide" onClick={onSecondary}>
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
