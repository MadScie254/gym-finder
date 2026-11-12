// Plan state kept on this device. Settings use the existing helper in
// src/lib/storage.ts; done ticks, my gym and session time are Plan's own keys.
import type { PlanSettings, PlanWeek } from "../../lib/planner";

const DONE_KEY = "fmg-plan-done-v1";
const GYM_KEY = "fmg-plan-gym-v1";
const TIME_KEY = "fmg-plan-time-v1";

export const DEFAULT_SESSION_TIME = "18:00";
export const SESSION_TIMES = ["05:30", "06:00", "06:30", "07:00", "12:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"] as const;

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage can be off in private browsing. The plan still works. */
  }
}

/**
 * Ticks are kept per plan shape, so switching settings and back restores them
 * instead of wiping them. Diet does not change sessions, so it is not part of the key.
 */
export function planKey(settings: PlanSettings): string {
  return [settings.goal, settings.level, settings.days, settings.venue].join("|");
}

function readDoneMap(): Record<string, string[]> {
  const stored = read(DONE_KEY);
  if (stored == null || typeof stored !== "object" || Array.isArray(stored)) return {};
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(stored)) {
    if (Array.isArray(value)) out[key] = value.filter((id): id is string => typeof id === "string");
  }
  return out;
}

export function loadDone(settings: PlanSettings): string[] {
  return readDoneMap()[planKey(settings)] ?? [];
}

export function saveDone(settings: PlanSettings, done: string[]): void {
  write(DONE_KEY, { ...readDoneMap(), [planKey(settings)]: done });
}

export function loadMyGymId(): string | null {
  const stored = read(GYM_KEY);
  return typeof stored === "string" ? stored : null;
}

export function saveMyGymId(id: string | null): void {
  write(GYM_KEY, id);
}

export function loadSessionTime(): string {
  const stored = read(TIME_KEY);
  return typeof stored === "string" && (SESSION_TIMES as readonly string[]).includes(stored) ? stored : DEFAULT_SESSION_TIME;
}

export function saveSessionTime(time: string): void {
  write(TIME_KEY, time);
}

/** The first week that still has an unticked session. Week 4 once everything is done. */
export function currentWeek(weeks: PlanWeek[], done: string[]): PlanWeek {
  return weeks.find((week) => week.sessions.some((session) => !done.includes(session.id))) ?? weeks[weeks.length - 1];
}
