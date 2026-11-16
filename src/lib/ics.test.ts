import { describe, expect, it } from "vitest";
import { buildIcs, escapeText, foldLine } from "./ics";
import { addDays, nairobiNow, parseClock, upcomingMonday } from "./nairobi";

describe("nairobi time", () => {
  it("reads wall-clock time at UTC+3", () => {
    // 2026-11-11 22:30 UTC is Thursday 01:30 in Nairobi.
    const now = nairobiNow(new Date("2026-11-11T22:30:00Z"));
    expect(now).toMatchObject({ year: 2026, month: 11, day: 12, weekday: "Thursday", hour: 1, minute: 30 });
  });

  it("finds the coming Monday, or today on a Monday", () => {
    expect(upcomingMonday(new Date("2026-11-11T09:00:00Z"))).toEqual({ year: 2026, month: 11, day: 16 });
    expect(upcomingMonday(new Date("2026-11-16T05:00:00Z"))).toEqual({ year: 2026, month: 11, day: 16 });
    // Sunday 22:00 UTC is already Monday 01:00 in Nairobi.
    expect(upcomingMonday(new Date("2026-11-15T22:00:00Z"))).toEqual({ year: 2026, month: 11, day: 16 });
  });

  it("adds days across month and year ends", () => {
    expect(addDays({ year: 2026, month: 12, day: 28 }, 7)).toEqual({ year: 2027, month: 1, day: 4 });
    expect(parseClock("18:30")).toBe(1110);
    expect(parseClock("25:00")).toBeNull();
  });
});

describe("ics writer", () => {
  const ics = buildIcs({
    name: "Test",
    now: new Date("2026-11-11T09:00:00Z"),
    events: [{
      uid: "a@test", date: { year: 2026, month: 11, day: 16 }, startMinutes: 23 * 60 + 30, durationMinutes: 50,
      summary: "Full body A, week 1", description: "Squat; press\nRow", location: "Gym, Westlands",
    }],
  });

  it("writes a valid calendar with CRLF line ends", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(ics).toContain("PRODID:");
    expect(ics).toContain("BEGIN:VTIMEZONE\r\nTZID:Africa/Nairobi");
  });

  it("uses Nairobi times and rolls past midnight", () => {
    expect(ics).toContain("DTSTART;TZID=Africa/Nairobi:20261116T233000");
    expect(ics).toContain("DTEND;TZID=Africa/Nairobi:20261117T002000");
    expect(ics).toContain("DTSTAMP:20261111T090000Z");
  });

  it("escapes text values", () => {
    expect(ics).toContain("DESCRIPTION:Squat\\; press\\nRow");
    expect(ics).toContain("LOCATION:Gym\\, Westlands");
    expect(escapeText("a\\b")).toBe("a\\\\b");
  });

  it("folds long lines at 75 octets without splitting characters", () => {
    const line = `SUMMARY:${"Mazoezi ya mwili mzima – ".repeat(8)}`;
    const folded = foldLine(line);
    const encoder = new TextEncoder();
    for (const part of folded.split("\r\n")) expect(encoder.encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.split("\r\n").map((part, i) => (i ? part.slice(1) : part)).join("")).toBe(line);
  });
});
