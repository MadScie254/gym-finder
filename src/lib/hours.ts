const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

export type OpenState =
  | { state: "open"; label: string }
  | { state: "closed"; label: string }
  | { state: "unknown"; label: string };

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

/** Documented subset: 24/7 and "Mo-Fr 06:00-21:00" rules. Anything else stays unknown and the raw string is shown. */
export function parseHours(raw: string | null | undefined, now = new Date()): OpenState {
  if (!raw?.trim()) return { state: "unknown", label: "Hours not listed — call to confirm." };
  const text = raw.trim();
  if (/24\s*\/\s*7/i.test(text)) return { state: "open", label: "Open now · 24/7" };

  const { weekday, minutes } = nairobiParts(now);
  const rules = text.split(";").map((rule) => rule.trim()).filter(Boolean);
  let matched = false;
  for (const rule of rules) {
    const match = /^([A-Za-z]{2}(?:-[A-Za-z]{2})?(?:,[A-Za-z]{2}(?:-[A-Za-z]{2})?)*)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/.exec(rule);
    if (!match) return { state: "unknown", label: text };
    const days = match[1].split(",").flatMap(daySpan);
    const open = toMinutes(match[2]);
    const close = toMinutes(match[3]);
    if (open == null || close == null) return { state: "unknown", label: text };
    if (!days.includes(weekday)) continue;
    matched = true;
    if (minutes >= open && minutes < close) return { state: "open", label: `Open now · closes ${match[3]}` };
  }
  if (!matched && rules.length) {
    const simple = rules.every((rule) => /^[A-Za-z]{2}/.test(rule));
    if (!simple) return { state: "unknown", label: text };
  }
  return { state: "closed", label: "Closed · hours listed" };
}
