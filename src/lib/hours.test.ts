import { describe, expect, it } from "vitest";
import { isParsedHours, parseHours } from "./hours";

describe("hours subset", () => {
  const mondayMorning = new Date("2026-10-12T06:30:00+03:00");

  it("treats 24/7 as open all day", () => {
    expect(parseHours("24/7", mondayMorning)).toEqual({ state: "open", allDay: true, closes: null });
  });

  it("parses a weekday range in Nairobi time", () => {
    expect(parseHours("Mo-Fr 06:00-21:00", mondayMorning)).toEqual({ state: "open", allDay: false, closes: "21:00" });
    expect(parseHours("Mo-Fr 06:00-21:00", new Date("2026-10-12T22:00:00+03:00")).state).toBe("closed");
  });

  it("treats days a weekly schedule leaves out as closed", () => {
    expect(parseHours("Mo-Sa 06:00-21:00", new Date("2026-10-11T10:00:00+03:00")).state).toBe("closed");
  });

  it("does not invent hours", () => {
    expect(parseHours(null).state).toBe("unknown");
    expect(parseHours("sunrise-sunset").state).toBe("unknown");
    expect(parseHours("5:00 AM – 10:00 PM").state).toBe("unknown");
    expect(isParsedHours("5:00 AM – 10:00 PM")).toBe(false);
    expect(isParsedHours("Mo-Fr 06:00-21:00; Sa 08:00-14:00")).toBe(true);
  });
});
