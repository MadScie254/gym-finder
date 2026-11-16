import { describe, expect, it } from "vitest";
import { PHOTOS } from "../../assets/photos";
import { buildTrainingPlan, DEFAULT_PLAN_SETTINGS } from "../../lib/planner";
import { sessionPhoto } from "./sessionPhoto";

describe("sessionPhoto", () => {
  it("follows the session's name", () => {
    expect(sessionPhoto({ title: "Full body A" })).toBe("dumbbells");
    expect(sessionPhoto({ title: "Full body B" })).toBe("functional-floor");
    expect(sessionPhoto({ title: "Steady cardio" })).toBe("treadmills");
    expect(sessionPhoto({ title: "Mobility & recovery" })).toBe("boxing-room");
  });

  it("falls back to weights for a name it does not know", () => {
    expect(sessionPhoto({ title: "Something new" })).toBe("dumbbells");
  });

  it("gives every session the planner can make a picture that exists, and each kind its own", () => {
    const seen = new Set<string>();
    for (const days of [2, 3, 4, 5] as const) {
      for (const goal of ["general", "strength", "endurance"] as const) {
        for (const week of buildTrainingPlan({ ...DEFAULT_PLAN_SETTINGS, days, goal })) {
          for (const session of week.sessions) {
            const id = sessionPhoto(session);
            expect(PHOTOS[id]).toBeDefined();
            seen.add(`${session.title}:${id}`);
          }
        }
      }
    }
    expect([...seen].sort()).toEqual([
      "Full body A:dumbbells",
      "Full body B:functional-floor",
      "Mobility & recovery:boxing-room",
      "Steady cardio:treadmills",
    ]);
  });
});
