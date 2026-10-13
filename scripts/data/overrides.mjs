/**
 * Git-as-CMS overrides (brief 5.6): every file under data/overrides/ is validated with
 * Zod and an invalid file fails the build instead of being half-applied.
 *
 *   exclude.json       [{ id, reason }]            drop a source record
 *   allow.json         [{ id, reason }]            keep a record the name deny-list would drop
 *   merge.json         [{ a, b, reason? }]         force two records into one venue
 *   known-closed.json  [name | { name, area?, reason? }]   owner-reported closures
 *   venues/<slug>.json { id, verifiedAt?, verification?, set?, closed?, closedAt? }
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { displayName } from "./merge-rules.mjs";
import { normalizePhones, whatsappChoice } from "./phones.mjs";
import { classifyUrls } from "./urls.mjs";

const IsoDate = z.iso.date();
const Id = z.string().min(3);
const Reason = z.string().min(3);

export const AMENITY_KEYS = ["weights", "classes", "pool", "sauna", "showers", "parking", "wheelchair", "women_only"];

export const ExcludeFile = z.array(z.strictObject({ id: Id, reason: Reason }));
export const AllowFile = z.array(z.strictObject({ id: Id, reason: Reason }));
export const MergeFile = z.array(z.strictObject({ a: Id, b: Id, reason: Reason.optional() }))
  .refine((rows) => rows.every((row) => row.a !== row.b), "a merge pair needs two different ids");
export const KnownClosedFile = z.array(z.union([
  z.string().min(2),
  z.strictObject({ name: z.string().min(2), area: z.string().optional(), reason: Reason.optional() }),
]));

export const VenueOverride = z.strictObject({
  id: Id,
  verifiedAt: IsoDate.optional(),
  verification: z.enum(["phone", "visit", "owner"]).optional(),
  set: z.strictObject({
    name: z.string().min(1),
    phone: z.union([z.string(), z.array(z.string())]),
    whatsapp: z.string(),
    hours: z.string().min(1),
    fee: z.literal("free"),
    amenities: z.partialRecord(z.enum(AMENITY_KEYS), z.literal(true)),
    address: z.string().nullable(),
    website: z.string(),
    instagram: z.string(),
    note: z.string(),
  }).partial().optional(),
  closed: z.boolean().optional(),
  closedAt: IsoDate.optional(),
}).refine((row) => !row.verifiedAt || row.verification, { message: "verifiedAt needs verification: phone | visit | owner" });

function readJson(file, schema, fallback) {
  if (!existsSync(file)) return fallback;
  let body;
  try {
    body = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${file}: not valid JSON (${error.message})`);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`${file}: ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  }
  return parsed.data;
}

/** Loads and validates everything under `dir`. Throws on the first invalid file. */
export function loadOverrides(dir) {
  const venues = new Map();
  const venueDir = path.join(dir, "venues");
  if (existsSync(venueDir)) {
    for (const file of readdirSync(venueDir).filter((name) => name.endsWith(".json")).sort()) {
      const row = readJson(path.join(venueDir, file), VenueOverride, null);
      if (venues.has(row.id)) throw new Error(`${path.join(venueDir, file)}: duplicate override for ${row.id}`);
      venues.set(row.id, { ...row, file });
    }
  }
  return {
    exclude: readJson(path.join(dir, "exclude.json"), ExcludeFile, []),
    allow: readJson(path.join(dir, "allow.json"), AllowFile, []),
    merge: readJson(path.join(dir, "merge.json"), MergeFile, []),
    knownClosed: readJson(path.join(dir, "known-closed.json"), KnownClosedFile, []),
    venues,
  };
}

const nameKey = (value) => `${value ?? ""}`.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/** True when an owner-reported closure names this venue (exact name; `area` narrows it). */
export function matchesKnownClosed(venue, entry) {
  const spec = typeof entry === "string" ? { name: entry } : entry;
  if (nameKey(venue.name) !== nameKey(spec.name)) return false;
  if (!spec.area) return true;
  const wanted = nameKey(spec.area);
  return [venue.area, venue.town, venue.county].some((place) => nameKey(place) === wanted);
}

/** The override that applies to a venue: matched by its id or any alias, so a tombstone survives a re-merge. */
export function overrideFor(venues, record) {
  return venues.get(record.id) ?? (record.aliases ?? []).map((alias) => venues.get(alias)).find(Boolean) ?? null;
}

/**
 * Applies an override's `set` to a merged venue record. Phones and WhatsApp numbers are
 * normalised to E.164 like every other source; an invalid one is reported, not applied.
 * @returns {{ venue: object, warnings: string[] }}
 */
export function applyOverride(venue, override) {
  const set = override?.set;
  if (!set) return { venue, warnings: [] };
  const warnings = [];
  const next = { ...venue, provenance: { ...venue.provenance } };
  const mark = (field) => { next.provenance[field] = "override"; };

  if (set.name) { next.name = displayName(set.name); mark("name"); }
  if (set.address !== undefined) { next.address = set.address; mark("address"); }
  if (set.phone !== undefined) {
    const { phones, dropped } = normalizePhones([].concat(set.phone));
    if (dropped.length) warnings.push(`${override.id}: override phone not a valid Kenyan number: ${dropped.join(", ")}`);
    if (phones.length) { next.phones = [...new Set([...phones, ...venue.phones])]; mark("phone"); }
  }
  if (set.whatsapp) {
    const choice = whatsappChoice([], set.whatsapp);
    if (choice) { next.whatsapp = choice.number; mark("whatsapp"); } else warnings.push(`${override.id}: override whatsapp is not a valid number`);
  }
  if (set.website || set.instagram) {
    const urls = classifyUrls([set.website, set.instagram && { url: set.instagram, hint: "instagram" }].filter(Boolean));
    if (set.website) {
      if (urls.website) { next.website = urls.website; mark("website"); } else warnings.push(`${override.id}: override website is not an own-domain http(s) URL`);
    }
    if (set.instagram) {
      if (urls.instagram) { next.instagram = urls.instagram; mark("instagram"); } else warnings.push(`${override.id}: override instagram is not an Instagram URL or handle`);
    }
  }
  if (set.hours) { next.hours = { raw: set.hours, source: "override" }; mark("hours"); }
  if (set.fee === "free") { next.fee = "free"; mark("fee"); }
  if (set.amenities) { next.amenities = { ...venue.amenities, ...set.amenities }; mark("amenities"); }
  return { venue: next, warnings };
}
