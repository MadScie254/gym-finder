import type { Venue } from "../data/types";
import { DEFAULT_PLAN_SETTINGS, type PlanSettings } from "./planner";

const SAVED_KEY = "fmg-saved-venues-v1";
const PLAN_KEY = "fmg-plan-settings-v1";
const ONBOARDED_KEY = "fmg-onboarded";
const INSTALL_DISMISS_KEY = "fmg-install-dismissed";
const RECENT_SEARCH_KEY = "fmg-recent-searches";
const LANG_KEY = "fmg-lang";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage can be unavailable. */
  }
}

function isVenue(value: unknown): value is Venue {
  if (value == null || typeof value !== "object") return false;
  const venue = value as Venue;
  return typeof venue.id === "string" && typeof venue.name === "string"
    && Number.isFinite(venue.lat) && Number.isFinite(venue.lng);
}

export function loadSavedVenues(): Venue[] {
  const stored = readJson<unknown>(SAVED_KEY, []);
  return Array.isArray(stored) ? stored.filter(isVenue) : [];
}

export function saveSavedVenues(venues: Venue[]): void {
  writeJson(SAVED_KEY, venues);
}

export function loadPlanSettings(): PlanSettings {
  const stored = readJson<Partial<PlanSettings>>(PLAN_KEY, {});
  return { ...DEFAULT_PLAN_SETTINGS, ...stored };
}

export function savePlanSettings(settings: PlanSettings): void {
  writeJson(PLAN_KEY, settings);
}

export function hasOnboarded(): boolean {
  return readJson<boolean>(ONBOARDED_KEY, false);
}

export function markOnboarded(): void {
  writeJson(ONBOARDED_KEY, true);
}

export function hasDismissedInstall(): boolean {
  return readJson<boolean>(INSTALL_DISMISS_KEY, false);
}

export function dismissInstall(): void {
  writeJson(INSTALL_DISMISS_KEY, true);
}

export function loadRecentSearches(): string[] {
  const stored = readJson<unknown>(RECENT_SEARCH_KEY, []);
  return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === "string") : [];
}

export function saveRecentSearch(query: string): void {
  const next = [query, ...loadRecentSearches().filter((item) => item !== query)].slice(0, 8);
  writeJson(RECENT_SEARCH_KEY, next);
}

export function loadLanguage(): "en" | "sw" {
  return readJson<"en" | "sw">(LANG_KEY, "en") === "sw" ? "sw" : "en";
}

export function saveLanguage(lang: "en" | "sw"): void {
  writeJson(LANG_KEY, lang);
}
