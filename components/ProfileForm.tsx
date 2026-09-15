"use client";

import {
  AMENITY_OPTIONS,
  BUDGET_OPTIONS,
  GOAL_OPTIONS,
  type ClientProfile,
} from "@/lib/types";

type ProfileFormProps = {
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
    <div className="flex h-full flex-col">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</p>

      <section className="mt-6">
        <h3 className="text-sm font-semibold text-slate-300">Goals</h3>
        <div className="mt-2 grid grid-cols-1 gap-2">
          {GOAL_OPTIONS.map((option) => {
            const active = profile.goals.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onChange({ ...profile, goals: toggle(profile.goals, option.id) })}
                className={`rounded-2xl border px-4 py-3 text-left ${
                  active ? "border-lime-300 bg-lime-300/10" : "border-white/10 bg-white/5"
                }`}
              >
                <span className="block text-sm font-medium text-white">{option.label}</span>
                <span className="block text-xs text-slate-400">{option.hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold text-slate-300">Budget</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {BUDGET_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange({ ...profile, budget: option.id })}
              className={`rounded-full px-3 py-2 text-sm ${
                profile.budget === option.id
                  ? "bg-lime-300 text-black"
                  : "bg-white/10 text-slate-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold text-slate-300">Amenities</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {AMENITY_OPTIONS.map((option) => {
            const active = profile.amenities.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() =>
                  onChange({ ...profile, amenities: toggle(profile.amenities, option.id) })
                }
                className={`rounded-full px-3 py-2 text-sm ${
                  active ? "bg-lime-300 text-black" : "bg-white/10 text-slate-200"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-auto flex flex-col gap-2 pt-6">
        <button
          type="button"
          onClick={onSubmit}
          className="h-12 rounded-2xl bg-lime-300 text-sm font-semibold text-black"
        >
          {primaryLabel}
        </button>
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            className="h-12 rounded-2xl bg-white/10 text-sm font-medium text-slate-200"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
