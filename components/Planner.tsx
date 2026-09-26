"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildMealPlan,
  buildTrainingPlan,
  DEFAULT_PLAN_SETTINGS,
  plateGuidance,
  type PlanSettings,
} from "@/lib/planner";
import type { ClientProfile } from "@/lib/types";

const SETTINGS_KEY = "kaya-plan-settings-v1";
const COMPLETED_KEY = "kaya-plan-completed-v1";

function startingGoal(profile: ClientProfile): PlanSettings["goal"] {
  if (profile.goals.includes("muscle")) return "strength";
  if (profile.goals.includes("cardio") || profile.goals.includes("sports")) return "endurance";
  return "general";
}

export default function Planner({ profile, onClose }: { profile: ClientProfile; onClose: () => void }) {
  const [settings, setSettings] = useState<PlanSettings>({ ...DEFAULT_PLAN_SETTINGS, goal: startingGoal(profile) });
  const [completed, setCompleted] = useState<string[]>([]);
  const [tab, setTab] = useState<"training" | "meals">("training");
  const [week, setWeek] = useState(1);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null") as Partial<PlanSettings> | null;
        if (stored && [2, 3, 4, 5].includes(Number(stored.days))) {
          setSettings({ ...DEFAULT_PLAN_SETTINGS, ...stored });
        }
        const saved = JSON.parse(localStorage.getItem(COMPLETED_KEY) ?? "[]") as unknown;
        if (Array.isArray(saved)) setCompleted(saved.filter((item): item is string => typeof item === "string"));
      } catch { /* Private browsing may disable storage. */ }
    });
    return () => { active = false; };
  }, []);

  const weeks = useMemo(() => buildTrainingPlan(settings), [settings]);
  const meals = useMemo(() => buildMealPlan(settings), [settings]);
  const activeWeek = weeks[week - 1];
  const totalSessions = weeks.reduce((count, item) => count + item.sessions.length, 0);

  function change<K extends keyof PlanSettings>(key: K, value: PlanSettings[K]) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    setCompleted([]);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      localStorage.removeItem(COMPLETED_KEY);
    } catch { /* Plan remains usable without storage. */ }
  }

  function toggleDone(id: string) {
    const next = completed.includes(id) ? completed.filter((item) => item !== id) : [...completed, id];
    setCompleted(next);
    try { localStorage.setItem(COMPLETED_KEY, JSON.stringify(next)); } catch { /* Optional persistence. */ }
  }

  return (
    <div className="planner">
      <div className="planner__head">
        <button type="button" className="ghost-btn" onClick={onClose}>Back to gyms</button>
        <p className="eyebrow">KAYA plan · on this device</p>
        <h2>Four weeks to get moving.</h2>
        <p>A practical training schedule and a flexible 7-day Kenyan menu. Change the settings to make it yours.</p>
      </div>

      <div className="planner__controls">
        <label>Focus
          <select value={settings.goal} onChange={(event) => change("goal", event.target.value as PlanSettings["goal"])}>
            <option value="general">Everyday fitness</option>
            <option value="strength">Build strength</option>
            <option value="endurance">Cardio & endurance</option>
          </select>
        </label>
        <label>Experience
          <select value={settings.level} onChange={(event) => change("level", event.target.value as PlanSettings["level"])}>
            <option value="beginner">Starting out</option>
            <option value="intermediate">Regular training</option>
          </select>
        </label>
        <label>Days each week
          <select value={settings.days} onChange={(event) => change("days", Number(event.target.value) as PlanSettings["days"])}>
            {[2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} days</option>)}
          </select>
        </label>
        <label>Where
          <select value={settings.venue} onChange={(event) => change("venue", event.target.value as PlanSettings["venue"])}>
            <option value="gym">At a gym</option>
            <option value="home">At home, no equipment</option>
          </select>
        </label>
      </div>

      <div className="seg planner__tabs" role="tablist" aria-label="Plan sections">
        <button type="button" role="tab" aria-selected={tab === "training"} className={tab === "training" ? "is-on" : ""} onClick={() => setTab("training")}>Training</button>
        <button type="button" role="tab" aria-selected={tab === "meals"} className={tab === "meals" ? "is-on" : ""} onClick={() => setTab("meals")}>Meals</button>
      </div>

      {tab === "training" ? (
        <section aria-label="Four-week training plan">
          <p className="planner__progress">{completed.length} of {totalSessions} sessions completed</p>
          <div className="planner__weeks" aria-label="Choose week">
            {weeks.map((item) => <button key={item.week} type="button" className={week === item.week ? "is-on" : ""} aria-pressed={week === item.week} onClick={() => setWeek(item.week)}>Week {item.week}</button>)}
          </div>
          <h3>{activeWeek.theme}</h3>
          <p className="planner__guidance">On other days, take an easy walk if you can. Aim to build toward 150 minutes of moderate movement a week, at your own pace.</p>
          <div className="planner__cards">
            {activeWeek.sessions.map((session) => <article key={session.id} className="planner__card">
              <div className="planner__card-top"><span>{session.day} · {session.duration}</span><label><input type="checkbox" checked={completed.includes(session.id)} onChange={() => toggleDone(session.id)} /> Done</label></div>
              <h4>{session.title}</h4>
              <ul>{session.exercises.map((exercise) => <li key={exercise}>{exercise}</li>)}</ul>
              <p>{session.note}</p>
            </article>)}
          </div>
          <p className="planner__safety">Stop if you feel pain, dizziness or unusual breathlessness. If pregnant, injured or managing a medical condition, ask a qualified professional to adapt this plan.</p>
          <a href="https://www.who.int/news-room/fact-sheets/detail/physical-activity" target="_blank" rel="noreferrer" className="planner__source">Activity guidance: World Health Organization ↗</a>
        </section>
      ) : (
        <section aria-label="Seven-day meal plan">
          <label className="planner__diet">Eating style
            <select value={settings.diet} onChange={(event) => change("diet", event.target.value as PlanSettings["diet"])}>
              <option value="omnivore">Mixed diet</option>
              <option value="vegetarian">Vegetarian (eggs and dairy)</option>
            </select>
          </label>
          <p className="planner__guidance">{plateGuidance(settings.goal)} Add water regularly. These are meal ideas, not calorie or medical prescriptions.</p>
          <div className="planner__cards">
            {meals.map((meal) => <article key={meal.day} className="planner__card planner__meal">
              <h4>{meal.day}</h4>
              <dl><dt>Breakfast</dt><dd>{meal.breakfast}</dd><dt>Lunch</dt><dd>{meal.lunch}</dd><dt>Dinner</dt><dd>{meal.dinner}</dd><dt>Snack</dt><dd>{meal.snack}</dd></dl>
            </article>)}
          </div>
          <p className="planner__safety">Check ingredients for your allergies and food restrictions. Portions vary with age, activity and health; a registered dietitian can personalize them.</p>
          <a href="https://www.who.int/news-room/fact-sheets/detail/healthy-diet" target="_blank" rel="noreferrer" className="planner__source">Healthy diet guidance: World Health Organization ↗</a>
        </section>
      )}
    </div>
  );
}
