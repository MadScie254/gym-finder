import { DEFAULT_PROFILE, type ClientProfile, type Gym } from "./types";

const PROFILE_KEY = "gym-finder-profile";
const FAVORITES_KEY = "gym-finder-favorites";
const SAVED_GYMS_KEY = "gym-finder-saved-gyms-v1";
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
    // Older builds offered price tiers that OSM data cannot substantiate.
    budget: stored.budget === "free" ? "free" : DEFAULT_PROFILE.budget,
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
  try { window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids)); } catch { /* Storage can be unavailable. */ }
}

export function loadSavedGyms(): Gym[] {
  const stored = readJson<unknown>(SAVED_GYMS_KEY, []);
  if (!Array.isArray(stored)) return [];
  return stored.filter((gym): gym is Gym =>
    gym != null && typeof gym === "object" &&
    typeof gym.id === "string" && typeof gym.name === "string" &&
    Number.isFinite(gym.location?.lat) && Number.isFinite(gym.location?.lng),
  );
}

export function saveSavedGyms(gyms: Gym[]): void {
  try { window.localStorage.setItem(SAVED_GYMS_KEY, JSON.stringify(gyms)); } catch { /* Storage can be unavailable. */ }
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
