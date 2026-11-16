import { useSyncExternalStore } from "react";
import { applyTheme, type ThemeChoice } from "../lib/storage";

const listeners = new Set<() => void>();

/** The choice in force is whatever <html data-theme> says. That is what the styles read, so it cannot disagree with the screen. */
function current(): ThemeChoice {
  const value = typeof document === "undefined" ? undefined : document.documentElement.dataset.theme;
  return value === "light" || value === "dark" ? value : "system";
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Apply a choice, remember it on this device, and tell every component that shows it (top bar, palette, menu). */
export function setTheme(choice: ThemeChoice): void {
  applyTheme(choice);
  listeners.forEach((listener) => listener());
}

/** The appearance choice, shared. Components must not keep their own copy: they would drift apart. */
export function useTheme(): readonly [ThemeChoice, (choice: ThemeChoice) => void] {
  return [useSyncExternalStore(subscribe, current, () => "system"), setTheme] as const;
}
