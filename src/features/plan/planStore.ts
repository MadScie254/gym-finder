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

// Set ticks: session id to the number of sets done per exercise index.
const SETS_KEY = "fmg-plan-sets-v1";
// Moved sessions: session id to the weekday it now falls on.
const MOVES_KEY = "fmg-plan-moves-v1";
const PAUSE_KEY = "fmg-plan-paused-v1";

export type SetTicks = Record<string, Record<string, number>>;
export type Moves = Record<string, string>;

function readRecord<T>(key: string, check: (value: unknown) => value is T): Record<string, T> {
  const stored = read(key);
  if (stored == null || typeof stored !== "object" || Array.isArray(stored)) return {};
  return Object.fromEntries(Object.entries(stored).filter((entry): entry is [string, T] => check(entry[1])));
}

const isCounts = (value: unknown): value is Record<string, number> => value != null && typeof value === "object"
  && !Array.isArray(value) && Object.values(value).every((n) => Number.isInteger(n) && (n as number) >= 0);
const isDay = (value: unknown): value is string => typeof value === "string"
  && ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].includes(value);

export function loadSets(settings: PlanSettings): Record<string, Record<string, number>> {
  return readRecord(SETS_KEY, (v): v is SetTicks => v != null && typeof v === "object" && !Array.isArray(v)
    && Object.values(v).every(isCounts))[planKey(settings)] ?? {};
}

export function saveSets(settings: PlanSettings, sets: Record<string, Record<string, number>>): void {
  const all = readRecord(SETS_KEY, (v): v is SetTicks => v != null && typeof v === "object");
  write(SETS_KEY, { ...all, [planKey(settings)]: sets });
}

export function loadMoves(settings: PlanSettings): Moves {
  return readRecord(MOVES_KEY, (v): v is Moves => v != null && typeof v === "object" && !Array.isArray(v)
    && Object.values(v).every(isDay))[planKey(settings)] ?? {};
}

export function saveMoves(settings: PlanSettings, moves: Moves): void {
  const all = readRecord(MOVES_KEY, (v): v is Moves => v != null && typeof v === "object");
  write(MOVES_KEY, { ...all, [planKey(settings)]: moves });
}

export function loadPaused(): boolean {
  return read(PAUSE_KEY) === true;
}

export function savePaused(paused: boolean): void {
  write(PAUSE_KEY, paused ? true : null);
}

export function isSettings(value: unknown): value is PlanSettings {
  if (value == null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return ["general", "strength", "endurance"].includes(v.goal as string)
    && ["beginner", "intermediate"].includes(v.level as string)
    && [2, 3, 4, 5].includes(v.days as number)
    && ["gym", "home"].includes(v.venue as string)
    && ["omnivore", "vegetarian"].includes(v.diet as string);
}

/** Storage may hold anything; fall back to defaults field by field. */
export function sanitizeSettings(value: PlanSettings, defaults: PlanSettings): PlanSettings {
  const out = { ...defaults };
  for (const key of Object.keys(defaults) as Array<keyof PlanSettings>) {
    const candidate = { ...defaults, [key]: value[key] };
    if (isSettings(candidate)) Object.assign(out, { [key]: value[key] });
  }
  return out;
}

/** Every key a backup carries. Settings use src/lib/storage.ts's key, read as-is. */
export const BACKUP_KEYS = [
  "fmg-plan-settings-v1", DONE_KEY, SETS_KEY, MOVES_KEY, PAUSE_KEY, GYM_KEY, TIME_KEY, "fmg-fuel-list-v1",
] as const;

export type PlanBackup = {
  app: "find-my-gym";
  kind: "my-week-backup";
  version: 1;
  exportedAt: string;
  data: Partial<Record<(typeof BACKUP_KEYS)[number], unknown>>;
};

export function exportBackup(now = new Date()): PlanBackup {
  const data: PlanBackup["data"] = {};
  for (const key of BACKUP_KEYS) {
    const value = read(key);
    if (value != null) data[key] = value;
  }
  return { app: "find-my-gym", kind: "my-week-backup", version: 1, exportedAt: now.toISOString(), data };
}

/** Restore a backup file's text. Returns how many parts were restored, or null if the file is not a backup. */
export function importBackup(text: string): number | null {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return null; }
  const backup = parsed as Partial<PlanBackup> | null;
  if (!backup || backup.app !== "find-my-gym" || backup.kind !== "my-week-backup" || backup.version !== 1
    || backup.data == null || typeof backup.data !== "object") return null;
  let restored = 0;
  for (const key of BACKUP_KEYS) {
    const value = (backup.data as Record<string, unknown>)[key];
    if (value === undefined) continue;
    if (key === "fmg-plan-settings-v1" && !isSettings(value)) continue;
    write(key, value);
    restored += 1;
  }
  return restored;
}
