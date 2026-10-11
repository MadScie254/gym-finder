import { useState } from "react";
import { buildMealPlan, buildTrainingPlan, DEFAULT_PLAN_SETTINGS, plateGuidance, type PlanSettings } from "../../lib/planner";
import { loadPlanSettings, savePlanSettings } from "../../lib/storage";

export function PlanPage() {
  const [settings, setSettings] = useState<PlanSettings>(() => loadPlanSettings());
  const weeks = buildTrainingPlan(settings);
  const meals = buildMealPlan(settings);

  function update(patch: Partial<PlanSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    savePlanSettings(next);
  }

  return (
    <section className="rail">
      <h1>Four-week plan</h1>
      <p className="muted">A conservative starting point. It does not diagnose conditions, count calories, or replace a trainer or clinician.</p>
      <label>Days
        <select value={settings.days} onChange={(event) => update({ days: Number(event.target.value) as PlanSettings["days"] })}>
          {[2, 3, 4, 5].map((day) => <option key={day} value={day}>{day}</option>)}
        </select>
      </label>
      <label>Place
        <select value={settings.venue} onChange={(event) => update({ venue: event.target.value as PlanSettings["venue"] })}>
          <option value="gym">Gym</option>
          <option value="home">Home</option>
        </select>
      </label>
      <p>{plateGuidance(settings.goal)}</p>
      {weeks.map((week) => (
        <section key={week.week}>
          <h2>Week {week.week}: {week.theme}</h2>
          <ul>{week.sessions.map((session) => <li key={session.id}>{session.day} — {session.title} ({session.duration})</li>)}</ul>
        </section>
      ))}
      <h2>Meals</h2>
      <ul>{meals.map((meal) => <li key={meal.day}>{meal.day}: {meal.lunch}</li>)}</ul>
      <button type="button" className="btn btn--ghost" onClick={() => update(DEFAULT_PLAN_SETTINGS)}>Reset</button>
    </section>
  );
}
