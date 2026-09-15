import { DEFAULT_PROFILE, type ClientProfile } from "./types";

const PROFILE_KEY = "gym-finder-profile";
const FAVORITES_KEY = "gym-finder-favorites";
const ONBOARDED_KEY = "gym-finder-onboarded";
const INSTALL_DISMISS_KEY = "gym-finder-install-dismissed";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadProfile(): ClientProfile {
  const stored = readJson<Partial<ClientProfile>>(PROFILE_KEY, {});
  return {
    goals: stored.goals ?? DEFAULT_PROFILE.goals,
    budget: stored.budget ?? DEFAULT_PROFILE.budget,
    amenities: stored.amenities ?? DEFAULT_PROFILE.amenities,
  };
}

export function saveProfile(profile: ClientProfile): void {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadFavorites(): string[] {
  return readJson<string[]>(FAVORITES_KEY, []);
}

export function saveFavorites(ids: string[]): void {
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

export function hasOnboarded(): boolean {
  return readJson<boolean>(ONBOARDED_KEY, false);
}

export function markOnboarded(): void {
  window.localStorage.setItem(ONBOARDED_KEY, JSON.stringify(true));
}

export function hasDismissedInstall(): boolean {
  return readJson<boolean>(INSTALL_DISMISS_KEY, false);
}

export function dismissInstall(): void {
  window.localStorage.setItem(INSTALL_DISMISS_KEY, JSON.stringify(true));
}
