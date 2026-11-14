// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { buildTrainingPlan, DEFAULT_PLAN_SETTINGS } from "../../lib/planner";
import { exportBackup, importBackup, loadDone, loadMoves, saveDone, saveMoves, sanitizeSettings } from "./planStore";
import { focusFor, freeDays, sessionsOf, setCount, totalSessions } from "./schedule";

const weeks = buildTrainingPlan(DEFAULT_PLAN_SETTINGS); // Monday, Wednesday, Friday
const MONDAY = new Date("2026-11-16T06:00:00Z");
const TUESDAY = new Date("2026-11-17T06:00:00Z");
const SATURDAY = new Date("2026-11-21T06:00:00Z");

describe("today's focus", () => {
  it("shows today's session on a training day", () => {
    const focus = focusFor(weeks, [], {}, MONDAY);
    expect(focus.when).toBe("today");
    expect(focus.session?.id).toBe("1-0");
    expect(focus.upcoming.map((s) => s.id)).toEqual(["1-1", "1-2"]);
  });

  it("shows the next session on a recovery day", () => {
    const focus = focusFor(weeks, ["1-0"], {}, TUESDAY);
    expect(focus).toMatchObject({ when: "later" });
    expect(focus.session?.effectiveDay).toBe("Wednesday");
  });

  it("keeps a missed session open instead of counting it against you", () => {
    const focus = focusFor(weeks, [], {}, SATURDAY);
    expect(focus.when).toBe("earlier");
    expect(focus.session?.id).toBe("1-0");
    expect(focus.week.week).toBe(1);
  });

  it("follows a moved session to its new day", () => {
    const focus = focusFor(weeks, [], { "1-0": "Tuesday" }, TUESDAY);
    expect(focus.when).toBe("today");
    expect(focus.session).toMatchObject({ id: "1-0", moved: true, effectiveDay: "Tuesday" });
    expect(sessionsOf(weeks[0], { "1-2": "Tuesday" }).map((s) => s.id)).toEqual(["1-0", "1-2", "1-1"]);
  });

  it("offers only free days to move to", () => {
    expect(freeDays(weeks[0], {}, "1-0")).toEqual(["Monday", "Tuesday", "Thursday", "Saturday", "Sunday"]);
  });

  it("reads set counts from exercise lines", () => {
    expect(setCount(weeks[0].sessions[0].exercises[1])).toBe(2);
    expect(setCount(weeks[0].sessions[0].exercises[0])).toBe(0);
    expect(totalSessions(weeks)).toBe(12);
  });
});

describe("backup and restore", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips progress through a file", () => {
    saveDone(DEFAULT_PLAN_SETTINGS, ["1-0", "1-1"]);
    saveMoves(DEFAULT_PLAN_SETTINGS, { "1-2": "Saturday" });
    const file = JSON.stringify(exportBackup(new Date("2026-11-14T10:00:00Z")));
    window.localStorage.clear();
    expect(loadDone(DEFAULT_PLAN_SETTINGS)).toEqual([]);
    expect(importBackup(file)).toBe(2);
    expect(loadDone(DEFAULT_PLAN_SETTINGS)).toEqual(["1-0", "1-1"]);
    expect(loadMoves(DEFAULT_PLAN_SETTINGS)).toEqual({ "1-2": "Saturday" });
  });

  it("refuses files that are not a backup and skips broken settings", () => {
    expect(importBackup("not json")).toBeNull();
    expect(importBackup(JSON.stringify({ app: "other" }))).toBeNull();
    const bad = { app: "find-my-gym", kind: "my-week-backup", version: 1, exportedAt: "", data: { "fmg-plan-settings-v1": { days: 9 } } };
    expect(importBackup(JSON.stringify(bad))).toBe(0);
  });

  it("repairs bad stored settings field by field", () => {
    const repaired = sanitizeSettings({ ...DEFAULT_PLAN_SETTINGS, days: 9 as 3, goal: "strength" }, DEFAULT_PLAN_SETTINGS);
    expect(repaired).toEqual({ ...DEFAULT_PLAN_SETTINGS, goal: "strength" });
  });
});
