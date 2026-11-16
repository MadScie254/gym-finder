import { useMemo, useState } from "react";
import { buildMealPlan, buildTrainingPlan, type MealDay, type PlanSettings, type PlanWeek } from "../../lib/planner";
import { loadPlanSettings } from "../../lib/storage";
import { loadDone, loadSessionTime } from "./planStore";

export type PlanSnapshot = {
  settings: PlanSettings;
  weeks: PlanWeek[];
  meals: MealDay[];
  done: string[];
  sessionTime: string;
};

/** Read-only view of the plan as saved on this device. Fuel uses it to fit food to training. */
export function usePlanSnapshot(): PlanSnapshot {
  const [settings] = useState(loadPlanSettings);
  const [done] = useState(() => loadDone(settings));
  const [sessionTime] = useState(loadSessionTime);
  return useMemo(() => ({
    settings,
    weeks: buildTrainingPlan(settings),
    meals: buildMealPlan(settings),
    done,
    sessionTime,
  }), [settings, done, sessionTime]);
}
