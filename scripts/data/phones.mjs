/**
 * Phone normalisation (build time only; never shipped to the browser).
 *
 * Uses libphonenumber-js "max" metadata: the default "min" bundle cannot tell a
 * mobile from a fixed line (getType() returns undefined), which would silently
 * disable every WhatsApp action. Numbers are kept only when they validate as
 * Kenyan (+254) numbers; everything else is dropped and reported by the caller.
 */
import { parsePhoneNumberFromString } from "libphonenumber-js/max";

/** Types that can reach a gym front desk. Premium-rate and the like are dropped. */
const KEEP_TYPES = new Set(["MOBILE", "FIXED_LINE", "FIXED_LINE_OR_MOBILE", "TOLL_FREE", "VOIP", undefined]);

/** OSM and web fields often hold several numbers in one string ("a; b", "a / b", "a or b"). */
export function splitPhoneField(raw) {
  return String(raw ?? "")
    .split(/[;,/\n]|\s+(?:or|and|&)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseKenyan(raw) {
  const parsed = parsePhoneNumberFromString(String(raw), "KE");
  if (!parsed || !parsed.isValid() || parsed.country !== "KE") return null;
  return parsed;
}

/** "mobile" | "fixed" | "other" for an E.164 string, from the library (never guessed). */
export function phoneKind(e164) {
  const type = parseKenyan(e164)?.getType();
  if (type === "MOBILE") return "mobile";
  if (type === "FIXED_LINE" || type === "FIXED_LINE_OR_MOBILE") return "fixed";
  return "other";
}

/**
 * @param {Iterable<unknown>} values raw phone strings (each may hold several numbers)
 * @returns {{ phones: string[], dropped: string[], types: Record<string, "mobile"|"fixed"|"other"> }}
 */
export function normalizePhones(values) {
  const phones = [];
  const dropped = [];
  const types = {};
  for (const value of values ?? []) {
    if (value === null || value === undefined || value === "") continue;
    for (const raw of splitPhoneField(value)) {
      const parsed = parseKenyan(raw);
      if (!parsed || !KEEP_TYPES.has(parsed.getType())) {
        dropped.push(raw);
        continue;
      }
      if (!phones.includes(parsed.number)) {
        phones.push(parsed.number);
        types[parsed.number] = phoneKind(parsed.number);
      }
    }
  }
  return { phones, dropped, types };
}

/**
 * A WhatsApp number. An explicit contact:whatsapp tag is trusted when it validates;
 * otherwise the first MOBILE phone is a guess (fixed lines never are).
 * @returns {{ number: string, source: "osm" | "mobile-guess" } | null}
 */
export function whatsappChoice(phones, explicit) {
  if (explicit) {
    for (const raw of splitPhoneField(explicit)) {
      const parsed = parseKenyan(raw);
      if (parsed) return { number: parsed.number, source: "osm" };
    }
  }
  for (const phone of phones ?? []) {
    if (phoneKind(phone) === "mobile") return { number: phone, source: "mobile-guess" };
  }
  return null;
}

export function whatsappFrom(phones, explicit) {
  return whatsappChoice(phones, explicit)?.number ?? null;
}
