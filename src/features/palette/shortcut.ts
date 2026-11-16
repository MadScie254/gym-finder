type PlatformInfo = Pick<Navigator, "platform" | "userAgent">;

const APPLE = /Mac|iPhone|iPad|iPod/i;

/** True on a Mac, iPhone or iPad, where the shortcut is Command K. Reads the platform first, then the user agent. */
export function isApplePlatform(nav: PlatformInfo | undefined = typeof navigator === "undefined" ? undefined : navigator): boolean {
  if (!nav) return false;
  return APPLE.test(nav.platform || "") || APPLE.test(nav.userAgent || "");
}

/** The shortcut as people read it on their keyboard. */
export function shortcutLabel(apple: boolean = isApplePlatform()): string {
  return apple ? "⌘K" : "Ctrl K";
}

/**
 * Command K or Ctrl K, in either letter case. Alt and Shift mean a different chord (AltGr reports
 * Ctrl and Alt together). Browser autofill sends key events with no `key`, so the type is checked.
 */
export function isPaletteShortcut(e: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">): boolean {
  if (typeof e.key !== "string") return false;
  return (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k";
}
