import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { buildMealPlan, buildTrainingPlan, DEFAULT_PLAN_SETTINGS, type MealDay, type PlanSettings, type PlanWeek } from "../../lib/planner";
import { loadPlanSettings, savePlanSettings } from "../../lib/storage";
import { loadSaved } from "../../lib/saved";
import type { Venue } from "../../data/types";
import {
  loadDone, loadMoves, loadMyGymId, loadPaused, loadSessionTime, loadSets, sanitizeSettings,
  saveDone, saveMoves, saveMyGymId, savePaused, saveSessionTime, saveSets, type Moves,
} from "./planStore";

const SETTINGS_KEY = "fmg-plan-settings-v1";

/** Saved gyms, read through the saved-gyms helper without changing its format. */
function loadSavedVenues(): Venue[] {
  return loadSaved().map((entry) => entry.snapshot);
}

function hasSavedSettings(): boolean {
  try { return window.localStorage.getItem(SETTINGS_KEY) != null; } catch { return false; }
}

type Sets = Record<string, Record<string, number>>;

type State = {
  settings: PlanSettings;
  done: string[];
  sets: Sets;
  moves: Moves;
  paused: boolean;
  sessionTime: string;
  myGymId: string | null;
  customised: boolean;
};

function readState(): State {
  const settings = sanitizeSettings(loadPlanSettings(), DEFAULT_PLAN_SETTINGS);
  return {
    settings,
    done: loadDone(settings),
    sets: loadSets(settings),
    moves: loadMoves(settings),
    paused: loadPaused(),
    sessionTime: loadSessionTime(),
    myGymId: loadMyGymId(),
    customised: hasSavedSettings(),
  };
}

export type PlanValue = State & {
  weeks: PlanWeek[];
  meals: MealDay[];
  savedGyms: Venue[];
  myGym: Venue | null;
  saveSettings: (next: PlanSettings) => void;
  toggleDone: (sessionId: string) => void;
  resetProgress: () => void;
  setSetsDone: (sessionId: string, exercise: number, count: number) => void;
  moveSession: (sessionId: string, day: string | null) => void;
  setPaused: (paused: boolean) => void;
  setSessionTime: (time: string) => void;
  setMyGymId: (id: string | null) => void;
  /** Re-read everything, for example after restoring a backup. */
  reload: () => void;
};

const PlanContext = createContext<PlanValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(readState);
  const [savedGyms, setSavedGyms] = useState(loadSavedVenues);

  const patch = useCallback((fn: (current: State) => Partial<State>) => setState((current) => ({ ...current, ...fn(current) })), []);

  const value = useMemo<PlanValue>(() => {
    const weeks = buildTrainingPlan(state.settings);
    return {
      ...state,
      weeks,
      meals: buildMealPlan(state.settings),
      savedGyms,
      myGym: savedGyms.find((gym) => gym.id === state.myGymId) ?? null,
      saveSettings: (next) => {
        savePlanSettings(next);
        setState((current) => ({
          ...current, settings: next, done: loadDone(next), sets: loadSets(next), moves: loadMoves(next), customised: true,
        }));
      },
      toggleDone: (id) => patch((current) => {
        const done = current.done.includes(id) ? current.done.filter((item) => item !== id) : [...current.done, id];
        saveDone(current.settings, done);
        return { done };
      }),
      resetProgress: () => patch((current) => {
        saveDone(current.settings, []);
        saveSets(current.settings, {});
        saveMoves(current.settings, {});
        return { done: [], sets: {}, moves: {} };
      }),
      setSetsDone: (id, exercise, count) => patch((current) => {
        const sets = { ...current.sets, [id]: { ...current.sets[id], [exercise]: Math.max(0, count) } };
        saveSets(current.settings, sets);
        return { sets };
      }),
      moveSession: (id, day) => patch((current) => {
        const moves = { ...current.moves };
        if (day) moves[id] = day;
        else delete moves[id];
        saveMoves(current.settings, moves);
        return { moves };
      }),
      setPaused: (paused) => { savePaused(paused); patch(() => ({ paused })); },
      setSessionTime: (sessionTime) => { saveSessionTime(sessionTime); patch(() => ({ sessionTime })); },
      setMyGymId: (myGymId) => { saveMyGymId(myGymId); patch(() => ({ myGymId })); },
      reload: () => { setState(readState()); setSavedGyms(loadSavedVenues()); },
    };
  }, [state, savedGyms, patch]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanValue {
  const value = useContext(PlanContext);
  if (!value) throw new Error("usePlan needs a PlanProvider");
  return value;
}
