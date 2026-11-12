import { describe, expect, it } from "vitest";
import { buildTrainingPlan, DEFAULT_PLAN_SETTINGS, type PlanSettings } from "../../lib/planner";
import { DEMO_STORES } from "./data";
import { daySlot, phaseFor, recommend, todaySession } from "./recommend";

// Monday 16 Nov 2026. Nairobi is UTC+3.
const MONDAY_0700 = new Date("2026-11-16T04:00:00Z");
const MONDAY_2000 = new Date("2026-11-16T17:00:00Z");
const TUESDAY_1300 = new Date("2026-11-17T10:00:00Z");

const MEAT = /chicken|beef|goat|fish|tilapia|kingfish|omena|liver|mince|steak|nyama|pilau|biryani/i;

function run(settings: PlanSettings, now: Date, extra: Partial<Parameters<typeof recommend>[0]> = {}) {
  const weeks = buildTrainingPlan(settings);
  const session = todaySession(weeks, [], now);
  return recommend({ settings, now, session, sessionTime: "18:00", town: "Nairobi", stores: DEMO_STORES, ...extra });
}

describe("training day detection", () => {
  it("finds Monday's session in week one and nothing on a rest day", () => {
    const weeks = buildTrainingPlan(DEFAULT_PLAN_SETTINGS); // Monday, Wednesday, Friday
    expect(todaySession(weeks, [], MONDAY_0700)?.title).toBe("Full body A");
    expect(todaySession(weeks, [], TUESDAY_1300)).toBeNull();
  });

  it("moves to the next week once the current one is ticked off", () => {
    const weeks = buildTrainingPlan(DEFAULT_PLAN_SETTINGS);
    const done = weeks[0].sessions.map((s) => s.id);
    expect(todaySession(weeks, done, MONDAY_0700)?.id).toBe("2-0");
  });

  it("splits the day around the session time, in Nairobi time", () => {
    const session = todaySession(buildTrainingPlan(DEFAULT_PLAN_SETTINGS), [], MONDAY_0700);
    expect(phaseFor(session, "18:00", MONDAY_0700)).toBe("later");
    expect(phaseFor(session, "09:00", MONDAY_0700)).toBe("before");
    expect(phaseFor(session, "18:00", MONDAY_2000)).toBe("after");
    expect(phaseFor(null, "18:00", MONDAY_2000)).toBe("rest");
    expect(daySlot(7)).toBe("morning");
    expect(daySlot(23)).toBe("late");
  });
});

describe("recommend", () => {
  it("returns 3 to 5 picks, each with a reason", () => {
    for (const now of [MONDAY_0700, MONDAY_2000, TUESDAY_1300]) {
      for (const town of ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"]) {
        const { picks } = run(DEFAULT_PLAN_SETTINGS, now, { town });
        expect(picks.length, `${town} ${now.toISOString()}`).toBeGreaterThanOrEqual(2);
        expect(picks.length).toBeLessThanOrEqual(5);
        expect(picks.every((p) => p.reason && p.store.town === town)).toBe(true);
      }
    }
    expect(run(DEFAULT_PLAN_SETTINGS, MONDAY_2000).picks.length).toBeGreaterThanOrEqual(3);
  });

  it("leads with high protein after a session", () => {
    const { guidance, picks } = run(DEFAULT_PLAN_SETTINGS, MONDAY_2000);
    expect(guidance.phase).toBe("after");
    expect(picks[0].item.tags).toContain("high-protein");
    expect(picks[0].reason).toBe("after-protein");
  });

  it("leans light and breakfast-like before a morning session", () => {
    const { guidance, picks } = run(DEFAULT_PLAN_SETTINGS, MONDAY_0700, { sessionTime: "09:00" });
    expect(guidance.phase).toBe("before");
    expect(picks.slice(0, 3).every((p) => p.item.tags.includes("pre-workout") || p.item.meal === "breakfast")).toBe(true);
  });

  it("never gives meat or a butchery to vegetarians", () => {
    const settings = { ...DEFAULT_PLAN_SETTINGS, diet: "vegetarian" as const, goal: "strength" as const };
    for (const now of [MONDAY_0700, MONDAY_2000, TUESDAY_1300]) {
      for (const town of [null, "Nairobi", "Nakuru"]) {
        const { picks, stores } = run(settings, now, { town });
        expect(picks.every((p) => p.item.tags.includes("vegetarian") && !MEAT.test(p.item.name))).toBe(true);
        expect(stores.some((s) => s.store.kind === "butchery")).toBe(false);
      }
    }
  });

  it("keeps variety: at most two picks from one store when the town has more", () => {
    const { picks } = run(DEFAULT_PLAN_SETTINGS, TUESDAY_1300);
    const counts = new Map<string, number>();
    for (const p of picks) counts.set(p.store.id, (counts.get(p.store.id) ?? 0) + 1);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
  });

  it("ranks stores by fit, then by straight-line distance", () => {
    const westlands = { lat: -1.26683, lng: 36.80806 };
    const { stores } = run(DEFAULT_PLAN_SETTINGS, MONDAY_2000, { origin: westlands });
    for (let i = 1; i < stores.length; i += 1) {
      const [a, b] = [stores[i - 1], stores[i]];
      expect(a.fit > b.fit || (a.fit === b.fit && (a.distanceKm ?? 0) <= (b.distanceKm ?? 0))).toBe(true);
    }
    expect(stores.every((s) => s.distanceKm != null)).toBe(true);
  });

  it("picks the nearest town from a location when no town is chosen", () => {
    const kisumu = { lat: -0.09, lng: 34.75 };
    const result = run(DEFAULT_PLAN_SETTINGS, TUESDAY_1300, { town: null, origin: kisumu });
    expect(result.town).toBe("Kisumu");
    expect(result.stores.every((s) => s.store.town === "Kisumu")).toBe(true);
  });

  it("is a rest day with no session time when the plan has nothing today", () => {
    const { guidance } = run(DEFAULT_PLAN_SETTINGS, TUESDAY_1300);
    expect(guidance).toMatchObject({ phase: "rest", session: null, sessionTime: null, slot: "midday" });
  });
});
