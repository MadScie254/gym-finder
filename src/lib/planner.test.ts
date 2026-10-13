import { describe, expect, it } from "vitest";
import { buildMealPlan, buildTrainingPlan, DEFAULT_PLAN_SETTINGS } from "./planner";

describe("four-week plan", () => {
  it("creates four weeks with the chosen number of sessions and recovery spacing", () => {
    for (const days of [2, 3, 4, 5] as const) {
      const plan = buildTrainingPlan({ ...DEFAULT_PLAN_SETTINGS, days });
      expect(plan).toHaveLength(4);
      expect(plan.every((week) => week.sessions.length === days)).toBe(true);
      expect(plan.every((week) => week.sessions.filter((session) => session.title.startsWith("Full body")).length >= 2)).toBe(true);
      expect(new Set(plan.flatMap((week) => week.sessions.map((session) => session.id))).size).toBe(4 * days);
    }
  });

  it("uses equipment-free moves for home and progresses beginner volume", () => {
    const plan = buildTrainingPlan({ ...DEFAULT_PLAN_SETTINGS, venue: "home" });
    expect(plan[0].sessions[0].exercises.join(" ")).toContain("Chair squat");
    expect(plan[0].sessions[0].exercises.join(" ")).toContain("2 sets");
    expect(plan[1].sessions[0].exercises.join(" ")).toContain("3 sets");
  });

  it("provides seven distinct Kenyan-style days without meat or fish for vegetarians", () => {
    const meals = buildMealPlan({ ...DEFAULT_PLAN_SETTINGS, diet: "vegetarian" });
    expect(meals).toHaveLength(7);
    expect(new Set(meals.map((day) => day.day)).size).toBe(7);
    expect(JSON.stringify(meals)).not.toMatch(/chicken|fish|tilapia/i);
  });
});
