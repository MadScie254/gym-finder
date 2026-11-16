import { DEFAULT_PLAN_SETTINGS, type PlanSettings } from "./planner";

const PLAN_KEY = "fmg-plan-settings-v1";
const INSTALL_DISMISS_KEY = "fmg-install-dismissed";
const RECENT_SEARCH_KEY = "fmg-recent-searches-v2";
const LANG_KEY = "fmg-lang";
const THEME_KEY = "fmg-theme";

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

export function loadPlanSettings(): PlanSettings {
  const stored = readJson<Partial<PlanSettings>>(PLAN_KEY, {});
  return { ...DEFAULT_PLAN_SETTINGS, ...stored };
}

export function savePlanSettings(settings: PlanSettings): void {
  writeJson(PLAN_KEY, settings);
}

export function hasDismissedInstall(): boolean {
  return readJson<boolean>(INSTALL_DISMISS_KEY, false);
}

export function dismissInstall(): void {
  writeJson(INSTALL_DISMISS_KEY, true);
}

export type RecentSearch = { label: string; href: string };

export function loadRecentSearches(): RecentSearch[] {
  const stored = readJson<unknown>(RECENT_SEARCH_KEY, []);
  if (!Array.isArray(stored)) return [];
  return stored.filter((item): item is RecentSearch => Boolean(item) && typeof item === "object"
    && typeof (item as RecentSearch).label === "string" && typeof (item as RecentSearch).href === "string"
    && (item as RecentSearch).href.startsWith("/")).slice(0, 5);
}

export function saveRecentSearch(item: RecentSearch): void {
  const next = [item, ...loadRecentSearches().filter((row) => row.href !== item.href)].slice(0, 5);
  writeJson(RECENT_SEARCH_KEY, next);
}

export function clearRecentSearches(): void {
  writeJson(RECENT_SEARCH_KEY, []);
}

export function loadLanguage(): "en" | "sw" {
  return readJson<"en" | "sw">(LANG_KEY, "en") === "sw" ? "sw" : "en";
}

export function saveLanguage(lang: "en" | "sw"): void {
  writeJson(LANG_KEY, lang);
}

export type ThemeChoice = "system" | "light" | "dark";

export function loadTheme(): ThemeChoice {
  const value = readJson<string>(THEME_KEY, "system");
  return value === "light" || value === "dark" ? value : "system";
}

/** Applies the choice to <html data-theme>, which tokens.css reads, and remembers it. */
export function applyTheme(choice: ThemeChoice, persist = true): void {
  if (typeof document !== "undefined") {
    if (choice === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = choice;
  }
  if (persist) writeJson(THEME_KEY, choice);
}

/** True once the visitor has set up My week on this device. */
export function hasPlanSettings(): boolean {
  if (typeof window === "undefined") return false;
  try { return window.localStorage.getItem(PLAN_KEY) != null; } catch { return false; }
}
