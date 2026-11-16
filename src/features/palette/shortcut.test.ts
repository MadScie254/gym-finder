import { describe, expect, it } from "vitest";
import { isApplePlatform, isPaletteShortcut, shortcutLabel } from "./shortcut";

const key = (over: Partial<Parameters<typeof isPaletteShortcut>[0]>) => ({ key: "k", metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...over });

describe("isApplePlatform", () => {
  it("is true on a Mac, an iPhone and an iPad", () => {
    expect(isApplePlatform({ platform: "MacIntel", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" })).toBe(true);
    expect(isApplePlatform({ platform: "iPhone", userAgent: "" })).toBe(true);
    expect(isApplePlatform({ platform: "", userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)" })).toBe(true);
  });

  it("is false on Windows, Linux and Android", () => {
    expect(isApplePlatform({ platform: "Win32", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" })).toBe(false);
    expect(isApplePlatform({ platform: "Linux x86_64", userAgent: "Mozilla/5.0 (X11; Linux x86_64)" })).toBe(false);
    expect(isApplePlatform({ platform: "Linux armv81", userAgent: "Mozilla/5.0 (Linux; Android 14)" })).toBe(false);
  });
});

describe("shortcutLabel", () => {
  it("shows the Command key on Apple devices and Ctrl elsewhere", () => {
    expect(shortcutLabel(true)).toBe("⌘K");
    expect(shortcutLabel(false)).toBe("Ctrl K");
  });
});

describe("isPaletteShortcut", () => {
  it("accepts Command K and Ctrl K in either case", () => {
    expect(isPaletteShortcut(key({ metaKey: true }))).toBe(true);
    expect(isPaletteShortcut(key({ ctrlKey: true }))).toBe(true);
    expect(isPaletteShortcut(key({ ctrlKey: true, key: "K" }))).toBe(true);
  });

  it("ignores K on its own, other keys, and chords with Alt or Shift", () => {
    expect(isPaletteShortcut(key({}))).toBe(false);
    expect(isPaletteShortcut(key({ ctrlKey: true, key: "j" }))).toBe(false);
    expect(isPaletteShortcut(key({ ctrlKey: true, altKey: true }))).toBe(false);
    expect(isPaletteShortcut(key({ metaKey: true, shiftKey: true }))).toBe(false);
  });

  it("ignores key events that carry no key, as browser autofill sends", () => {
    expect(isPaletteShortcut({ ...key({ ctrlKey: true }), key: undefined as unknown as string })).toBe(false);
  });
});
