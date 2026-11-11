/**
 * Venue override files: data/overrides/venues/<slug>.json.
 * Loaded and validated here so a bad file fails the build instead of shipping.
 */
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const AMENITY_KEYS = ["weights", "classes", "pool", "sauna", "showers", "parking", "wheelchair", "women_only"];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const phone = z.string().regex(/^\+254\d{7,9}$/, "expected +254 phone");

/** OpenStreetMap opening_hours, limited to plain weekday rules: "Mo-Fr 05:00-22:00; Sa 07:00-20:00". */
const TIME_RANGE = "\\d{2}:\\d{2}-\\d{2}:\\d{2}";
const DAY = "(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)";
const DAYS = `${DAY}(?:-${DAY})?(?:,${DAY}(?:-${DAY})?)*`;
const RULE = `${DAYS} ${TIME_RANGE}(?:,${TIME_RANGE})*`;
export const OSM_HOURS = new RegExp(`^(?:24/7|${RULE}(?:; ${RULE})*)$`);

export const Evidence = z.object({
  url: z.string().url(),
  quote: z.string().min(3).max(199),
}).strict();

const Price = z.object({
  amount: z.number().positive(),
  currency: z.literal("KES"),
  period: z.enum(["day", "month"]),
  /** The price exactly as the site writes it. */
  text: z.string().min(1).max(199),
  /** Date the price was read on a page showing current content; null when the page is undated or looks old. */
  asOf: isoDate.nullable(),
  note: z.string().max(300).optional(),
}).strict();

const Set = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).nullable().optional(),
  website: z.string().url().optional(),
  instagram: z.string().url().optional(),
  phone: phone.optional(),
  whatsapp: phone.optional(),
  /** OSM opening_hours syntax, only when the site's wording maps to it without guessing. */
  hours: z.string().regex(OSM_HOURS, "hours must be OSM opening_hours syntax; put other wording in hoursText").optional(),
  /** Hours transcribed from the source, verbatim. */
  hoursText: z.string().min(1).max(199).optional(),
  fee: z.literal("free").optional(),
  amenities: z.partialRecord(z.enum(AMENITY_KEYS), z.literal(true)).optional(),
  prices: z.object({
    dayPass: Price.optional(),
    monthly: Price.optional(),
  }).strict().optional(),
}).strict();

export const VenueOverride = z.object({
  id: z.string().min(1),
  /** Informational only: the name this file was written for. */
  name: z.string().optional(),
  closed: z.boolean().optional(),
  verifiedAt: isoDate.optional(),
  verification: z.enum(["website", "phone", "visit"]).optional(),
  set: Set.optional(),
  /** Field path ("hours", "amenities.pool", "prices.monthly", "operating") to the source that shows it. */
  evidence: z.record(z.string(), Evidence).optional(),
  notes: z.array(z.string().max(400)).optional(),
}).strict().superRefine((body, ctx) => {
  const evidence = body.evidence ?? {};
  const need = (key) => {
    if (!evidence[key]) ctx.addIssue({ code: "custom", message: `missing evidence for ${key}`, path: ["evidence", key] });
  };
  if (body.verifiedAt || body.verification) {
    if (!body.verifiedAt) ctx.addIssue({ code: "custom", message: "verification without verifiedAt", path: ["verifiedAt"] });
    if (!body.verification) ctx.addIssue({ code: "custom", message: "verifiedAt without verification method", path: ["verification"] });
  }
  if (body.verification === "website") {
    need("operating");
    const set = body.set ?? {};
    for (const key of ["name", "address", "website", "instagram", "phone", "whatsapp", "fee"]) {
      if (set[key] !== undefined && set[key] !== null) need(key);
    }
    if (set.hours !== undefined || set.hoursText !== undefined) need("hours");
    if (set.hours && !set.hoursText) {
      ctx.addIssue({ code: "custom", message: "OSM hours need the verbatim hoursText they came from", path: ["set", "hoursText"] });
    }
    for (const key of Object.keys(set.amenities ?? {})) need(`amenities.${key}`);
    for (const key of Object.keys(set.prices ?? {})) need(`prices.${key}`);
  }
  if (body.closed && !body.evidence?.closed) need("closed");
});

/** Read and validate every override file. Throws with file name and reason on the first bad file. */
export async function loadVenueOverrides(dir) {
  const venues = {};
  if (!existsSync(dir)) return venues;
  for (const file of (await readdir(dir)).sort()) {
    if (!file.endsWith(".json")) continue;
    const raw = JSON.parse(await readFile(path.join(dir, file), "utf8"));
    const parsed = VenueOverride.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new Error(`data/overrides/venues/${file}: ${issue.path.join(".")} ${issue.message}`);
    }
    if (venues[parsed.data.id]) throw new Error(`data/overrides/venues/${file}: duplicate override for ${parsed.data.id}`);
    venues[parsed.data.id] = parsed.data;
  }
  return venues;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function humanDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** Trust reason that says exactly what was checked, so the UI never implies a visit. */
export function verificationReason(method, verifiedAt) {
  const when = humanDate(verifiedAt);
  if (method === "website") return `Details confirmed on the gym's own website on ${when}`;
  if (method === "phone") return `Details confirmed by phone with the gym on ${when}`;
  return `Visited by a Find My Gym reviewer on ${when}`;
}
