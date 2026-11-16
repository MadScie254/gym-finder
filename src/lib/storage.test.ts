// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSidebarCollapsed, nextTheme, saveSidebarCollapsed } from "./storage";

const SIDEBAR_KEY = "fmg-sidebar-collapsed";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("nextTheme", () => {
  it("cycles match device, light, dark and round again", () => {
    expect(nextTheme("system")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("system");
  });
});

describe("sidebar choice", () => {
  it("is null until the person chooses", () => {
    expect(loadSidebarCollapsed()).toBeNull();
  });

  it("remembers both choices", () => {
    saveSidebarCollapsed(true);
    expect(loadSidebarCollapsed()).toBe(true);
    saveSidebarCollapsed(false);
    expect(loadSidebarCollapsed()).toBe(false);
  });

  it("treats junk as no choice", () => {
    for (const junk of ["maybe", JSON.stringify("maybe"), "1", "null", "{"]) {
      localStorage.setItem(SIDEBAR_KEY, junk);
      expect(loadSidebarCollapsed()).toBeNull();
    }
  });

  it("does not throw when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(loadSidebarCollapsed()).toBeNull();
    expect(() => saveSidebarCollapsed(true)).not.toThrow();
  });
});
