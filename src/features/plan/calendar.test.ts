import { describe, expect, it } from "vitest";
import { buildTrainingPlan, DEFAULT_PLAN_SETTINGS } from "../../lib/planner";
import { planCalendar, planEvents, sessionMinutes } from "./calendar";
import { splitExercise } from "./exercise";

const start = { year: 2026, month: 11, day: 16 }; // a Monday

describe("plan calendar", () => {
  it("writes one VEVENT per session across four weeks", () => {
    for (const days of [2, 3, 4, 5] as const) {
      const weeks = buildTrainingPlan({ ...DEFAULT_PLAN_SETTINGS, days });
      const ics = planCalendar(weeks, { start, time: "18:30", now: new Date("2026-11-11T09:00:00Z") });
      expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(4 * days);
      expect(ics.match(/END:VEVENT/g)).toHaveLength(4 * days);
      expect(ics.match(/^BEGIN:VCALENDAR/gm)).toHaveLength(1);
      expect(new Set(ics.match(/^UID:.*$/gm)).size).toBe(4 * days);
    }
  });

  it("puts sessions on their weekday at the chosen Nairobi time", () => {
    const weeks = buildTrainingPlan({ ...DEFAULT_PLAN_SETTINGS, days: 3 });
    const events = planEvents(weeks, { start, time: "06:30" });
    // 3 days: Monday, Wednesday, Friday.
    expect(events.slice(0, 3).map((e) => e.date.day)).toEqual([16, 18, 20]);
    expect(events[3].date).toEqual({ year: 2026, month: 11, day: 23 });
    const ics = planCalendar(weeks, { start, time: "06:30" });
    expect(ics).toContain("DTSTART;TZID=Africa/Nairobi:20261116T063000");
    expect(ics).toContain("DTEND;TZID=Africa/Nairobi:20261116T072000");
  });

  it("names my gym as the location and keeps the safety line", () => {
    const weeks = buildTrainingPlan(DEFAULT_PLAN_SETTINGS);
    const ics = planCalendar(weeks, { start, time: "18:00", gymName: "Level 24, Parklands" });
    expect(ics).toContain("LOCATION:Level 24\\, Parklands");
    expect(ics.replace(/\r\n /g, "")).toContain("Stop if you feel pain\\, dizziness or unusual breathlessness.");
    expect(ics).not.toContain(" · ");
  });

  it("reads the longest minutes from a duration", () => {
    expect(sessionMinutes("35–50 min")).toBe(50);
    expect(sessionMinutes("about")).toBe(45);
  });

  it("splits the planner's dotted exercise strings", () => {
    expect(splitExercise("Goblet squat · 2 sets of 8–10 comfortable reps")).toEqual({ move: "Goblet squat", dose: "2 sets of 8–10 comfortable reps" });
    expect(splitExercise("Easy walk for 10 minutes")).toEqual({ move: "Easy walk for 10 minutes", dose: null });
  });
});
