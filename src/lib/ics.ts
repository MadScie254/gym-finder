// A small iCalendar (RFC 5545) writer for files made in the browser.
// Times are written as Nairobi wall-clock time with a VTIMEZONE block.
import type { LocalDate } from "./nairobi";

export const ICS_TZID = "Africa/Nairobi";

export type IcsEvent = {
  /** Stable and unique, so re-importing updates events instead of duplicating them. */
  uid: string;
  date: LocalDate;
  /** Minutes after midnight, Nairobi time. */
  startMinutes: number;
  durationMinutes: number;
  summary: string;
  description?: string;
  location?: string;
};

export type IcsCalendar = {
  name: string;
  events: IcsEvent[];
  /** Used for DTSTAMP. */
  now?: Date;
};

const pad = (value: number, size = 2) => String(value).padStart(size, "0");

function localStamp(date: LocalDate, minutes: number): string {
  const extraDays = Math.floor(minutes / 1440);
  const inDay = minutes - extraDays * 1440;
  const day = new Date(Date.UTC(date.year, date.month - 1, date.day + extraDays));
  return `${day.getUTCFullYear()}${pad(day.getUTCMonth() + 1)}${pad(day.getUTCDate())}T${pad(Math.floor(inDay / 60))}${pad(inDay % 60)}00`;
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escape TEXT values: backslash, semicolon, comma and newlines. */
export function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold a content line at 75 octets, never inside a UTF-8 character. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (size + bytes > limit) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcs({ name, events, now = new Date() }: IcsCalendar): string {
  const stamp = utcStamp(now);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Find My Gym//Training plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    `X-WR-TIMEZONE:${ICS_TZID}`,
    "BEGIN:VTIMEZONE",
    `TZID:${ICS_TZID}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0300",
    "TZOFFSETTO:+0300",
    "TZNAME:EAT",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${ICS_TZID}:${localStamp(event.date, event.startMinutes)}`,
      `DTEND;TZID=${ICS_TZID}:${localStamp(event.date, event.startMinutes + event.durationMinutes)}`,
      `SUMMARY:${escapeText(event.summary)}`,
    );
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/** Save text as a file through a temporary link. Browser only. */
export function downloadText(filename: string, text: string, type = "text/calendar;charset=utf-8"): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
