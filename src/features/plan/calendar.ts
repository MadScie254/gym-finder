import { buildIcs, type IcsEvent } from "../../lib/ics";
import { addDays, parseClock, WEEKDAYS, type LocalDate } from "../../lib/nairobi";
import type { PlanWeek } from "../../lib/planner";
import { exerciseLine } from "./exercise";

/** "35–50 min" to 50. Falls back to 45 if the text has no number. */
export function sessionMinutes(duration: string): number {
  const numbers = duration.match(/\d+/g)?.map(Number) ?? [];
  return numbers.length ? Math.max(...numbers) : 45;
}

export type CalendarOptions = {
  /** Monday of week 1. */
  start: LocalDate;
  /** "18:00", Nairobi time. */
  time: string;
  gymName?: string | null;
  now?: Date;
};

export function planEvents(weeks: PlanWeek[], { start, time, gymName }: CalendarOptions): IcsEvent[] {
  const startMinutes = parseClock(time) ?? 18 * 60;
  const stamp = `${start.year}${String(start.month).padStart(2, "0")}${String(start.day).padStart(2, "0")}`;
  return weeks.flatMap((week) => week.sessions.map((session): IcsEvent => {
    const weekday = WEEKDAYS.indexOf(session.day as (typeof WEEKDAYS)[number]);
    const date = addDays(start, (week.week - 1) * 7 + Math.max(weekday, 0));
    return {
      uid: `plan-${stamp}-${session.id}@findmygym`,
      date,
      startMinutes,
      durationMinutes: sessionMinutes(session.duration),
      summary: `${session.title}, week ${week.week}`,
      description: [...session.exercises.map(exerciseLine), "", session.note,
        "Stop if you feel pain, dizziness or unusual breathlessness."].join("\n"),
      location: gymName ?? undefined,
    };
  }));
}

export function planCalendar(weeks: PlanWeek[], options: CalendarOptions): string {
  return buildIcs({ name: "Find My Gym training plan", events: planEvents(weeks, options), now: options.now });
}
