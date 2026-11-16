// Which session is next, given ticks and moved days. Pure: callers pass `now`.
import { nairobiNow, WEEKDAYS } from "../../lib/nairobi";
import type { PlanSession, PlanWeek } from "../../lib/planner";
import { currentWeek, type Moves } from "./planStore";
import { splitExercise } from "./exercise";

export type DaySession = PlanSession & { effectiveDay: string; moved: boolean };

export function dayIndex(day: string): number {
  return WEEKDAYS.indexOf(day as (typeof WEEKDAYS)[number]);
}

export function sessionsOf(week: PlanWeek, moves: Moves): DaySession[] {
  return week.sessions
    .map((session) => ({ ...session, effectiveDay: moves[session.id] ?? session.day, moved: session.id in moves }))
    .sort((a, b) => dayIndex(a.effectiveDay) - dayIndex(b.effectiveDay));
}

export type Focus = {
  week: PlanWeek;
  /** The session to show first: today's, else the next one, else one still open from earlier this week. */
  session: DaySession | null;
  when: "today" | "later" | "earlier" | "none";
  /** Other open sessions this week, in day order. */
  upcoming: DaySession[];
};

export function focusFor(weeks: PlanWeek[], done: string[], moves: Moves, now: Date): Focus {
  const week = currentWeek(weeks, done);
  const today = nairobiNow(now).weekdayIndex;
  const open = sessionsOf(week, moves).filter((session) => !done.includes(session.id));
  const todays = open.find((session) => dayIndex(session.effectiveDay) === today);
  const later = open.find((session) => dayIndex(session.effectiveDay) > today);
  const earlier = open.find((session) => dayIndex(session.effectiveDay) < today);
  const session = todays ?? later ?? earlier ?? null;
  const when = todays ? "today" : later ? "later" : earlier ? "earlier" : "none";
  return { week, session, when, upcoming: open.filter((item) => item !== session) };
}

/** Days in this week a session can move to: no other session that day. */
export function freeDays(week: PlanWeek, moves: Moves, sessionId: string): string[] {
  const taken = new Set(sessionsOf(week, moves).filter((s) => s.id !== sessionId).map((s) => s.effectiveDay));
  return WEEKDAYS.filter((day) => !taken.has(day));
}

/** "Goblet squat · 3 sets of 8–10 comfortable reps" has 3 sets. Plain lines have none. */
export function setCount(exercise: string): number {
  const dose = splitExercise(exercise).dose;
  const match = dose ? /(\d+) sets?/.exec(dose) : null;
  return match ? Number(match[1]) : 0;
}

export function totalSessions(weeks: PlanWeek[]): number {
  return weeks.reduce((sum, week) => sum + week.sessions.length, 0);
}
