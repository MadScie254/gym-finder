// Wall-clock time in Kenya. East Africa Time is UTC+3 all year (no daylight
// saving), so a fixed offset is exact and needs no time-zone database.

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** A calendar date with no time zone attached. Month is 1 to 12. */
export type LocalDate = { year: number; month: number; day: number };

export type NairobiNow = LocalDate & {
  /** 0 = Monday ... 6 = Sunday. */
  weekdayIndex: number;
  weekday: Weekday;
  hour: number;
  minute: number;
};

export function nairobiNow(date: Date = new Date()): NairobiNow {
  const shifted = new Date(date.getTime() + EAT_OFFSET_MS);
  const weekdayIndex = (shifted.getUTCDay() + 6) % 7;
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekdayIndex,
    weekday: WEEKDAYS[weekdayIndex],
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

/** The next Monday in Nairobi, or today if today is Monday. */
export function upcomingMonday(date: Date = new Date()): LocalDate {
  const now = nairobiNow(date);
  return addDays(now, (7 - now.weekdayIndex) % 7);
}

/** "18:30" to minutes after midnight. Returns null for anything else. */
export function parseClock(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}
