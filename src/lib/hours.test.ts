import { describe, expect, it } from "vitest";
import { parseHours } from "./hours";

describe("hours subset", () => {
  const mondayMorning = new Date("2026-10-12T06:30:00+03:00");

  it("treats 24/7 as open", () => {
    expect(parseHours("24/7", mondayMorning).state).toBe("open");
  });

  it("parses a weekday range in Nairobi time", () => {
    expect(parseHours("Mo-Fr 06:00-21:00", mondayMorning).label).toContain("Open now");
    expect(parseHours("Mo-Fr 06:00-21:00", new Date("2026-10-12T22:00:00+03:00")).state).toBe("closed");
  });

  it("does not invent hours", () => {
    expect(parseHours(null).label).toContain("Hours not listed");
    expect(parseHours("sunrise-sunset").state).toBe("unknown");
  });
});
