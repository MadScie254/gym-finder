// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { nextTheme } from "./storage";

describe("nextTheme", () => {
  it("cycles match device, light, dark and round again", () => {
    expect(nextTheme("system")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("system");
  });
});
