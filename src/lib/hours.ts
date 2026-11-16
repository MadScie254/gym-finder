const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const RULE = /^([A-Za-z]{2}(?:-[A-Za-z]{2})?(?:,[A-Za-z]{2}(?:-[A-Za-z]{2})?)*)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/;

/**
 * Open state from listed hours. `unknown` means the hours are missing or in a form we do not
 * parse; the interface then shows the source wording and asks people to call.
 */
export type OpenState =
  | { state: "open"; allDay: boolean; closes: string | null }
  | { state: "closed" }
  | { state: "unknown" };

function nairobiParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value.slice(0, 2) ?? "Mo";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return { weekday, minutes: hour * 60 + minute };
}

function daySpan(token: string): string[] {
  const [start, end] = token.split("-");
  if (!end) return [start];
  const from = DAYS.indexOf(start as (typeof DAYS)[number]);
  const to = DAYS.indexOf(end as (typeof DAYS)[number]);
  if (from < 0 || to < 0) return [];
  const out: string[] = [];
  for (let i = from; i !== to; i = (i + 1) % 7) out.push(DAYS[i]);
  out.push(DAYS[to]);
  return out;
}

function toMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** True when the string is in the documented subset: 24/7, or rules like "Mo-Fr 06:00-21:00; Sa 08:00-14:00". */
export function isParsedHours(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return false;
  const text = raw.trim();
  if (/^24\s*\/\s*7$/i.test(text)) return true;
  return text.split(";").map((rule) => rule.trim()).filter(Boolean).every((rule) => RULE.test(rule));
}

/** Documented subset only. Days a weekly schedule leaves out count as closed. */
export function parseHours(raw: string | null | undefined, now = new Date()): OpenState {
  if (!isParsedHours(raw)) return { state: "unknown" };
  const text = (raw ?? "").trim();
  if (/^24\s*\/\s*7$/i.test(text)) return { state: "open", allDay: true, closes: null };
  const { weekday, minutes } = nairobiParts(now);
  for (const rule of text.split(";").map((item) => item.trim()).filter(Boolean)) {
    const match = RULE.exec(rule);
    if (!match) return { state: "unknown" };
    const days = match[1].split(",").flatMap(daySpan);
    const open = toMinutes(match[2]);
    const close = toMinutes(match[3]);
    if (open == null || close == null) return { state: "unknown" };
    if (days.includes(weekday) && minutes >= open && minutes < close) {
      return { state: "open", allDay: false, closes: match[3] };
    }
  }
  return { state: "closed" };
}
