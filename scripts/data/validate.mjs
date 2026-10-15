/**
 * Validation gates (brief 5.8). Exit code 1 if any trips. Nothing here is relaxed to make a
 * build pass: if the real data cannot meet a gate, the build is reported as failing.
 *
 *   Zod schema per venue; every venue inside the Kenya polygon; unique ids and slugs;
 *   phones E.164 +254; URLs http(s) only, social hosts never in `website`; address never
 *   "Kenya"; default-visible total >= 350 and not >15% below the previous build; Nairobi
 *   default-visible >= 150; every county in the manifest; payload <= 150 KB gzip,
 *   landmarks <= 60 KB gzip; licence notices in the manifest, LICENSE-DATA.md and NOTICE;
 *   one hashed gyms file whose name matches its content; manifest counts match the data;
 *   "Verified" only from an override file; web research never above "listed".
 * The golden-set test runs under vitest (npm test).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { z } from "zod";
import { COUNTIES, isInKenya } from "./geo.mjs";
import { LANDMARK_GZIP_BUDGET } from "./landmarks.mjs";
import { loadOverrides, overrideFor, AMENITY_KEYS } from "./overrides.mjs";
import { HASHED, contentHash } from "./publish.mjs";
import { hostOf, isSocialOrAggregatorHost } from "./urls.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PUBLIC_DATA = path.join(ROOT, "public", "data");

export const MIN_VISIBLE = 350;
export const MIN_NAIROBI = 150;
export const MAX_DROP = 0.15;
export const GYMS_GZIP_BUDGET = 150 * 1024;

const COUNTY_NAMES = new Set(COUNTIES.map((county) => county.name));
const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const E164 = z.string().regex(/^\+254\d{7,9}$/);

const httpUrl = (check = () => true, message = "not an http(s) URL") =>
  z.string().refine((value) => {
    try {
      const url = new URL(value);
      return /^https?:$/.test(url.protocol) && check(url);
    } catch {
      return false;
    }
  }, message);

/** Strict: an unknown key (rating, priceLevel, photoName, reviews, ...) fails the build. */
export const VenueSchema = z.strictObject({
  id: z.string().regex(/^(?:osm:(?:node|way|relation)\/\d+|gers:[0-9a-f-]{36}|web:.+)$/),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{4,}$/),
  aliases: z.array(z.string().min(1)),
  name: z.string().min(1),
  nameRaw: z.string().min(1).optional(),
  kind: z.enum(["gym", "crossfit", "yoga", "pilates", "martial_arts", "boxing", "gymnastics", "boot_camp"]),
  lat: z.number().finite(),
  lng: z.number().finite(),
  area: z.string().min(1).nullable(),
  town: z.string().min(1).nullable(),
  county: z.string().refine((name) => COUNTY_NAMES.has(name), "not a county in COUNTIES").nullable(),
  address: z.string().min(1).refine((value) => !/^kenya$/i.test(value.trim()), 'address must be null, never "Kenya"').nullable(),
  phones: z.array(E164),
  whatsapp: E164.nullable(),
  website: httpUrl((url) => !isSocialOrAggregatorHost(hostOf(url)), "website must be the venue's own domain, not a social or short-link host").nullable(),
  instagram: httpUrl((url) => /(^|\.)instagram\.com$/.test(url.hostname), "not an Instagram URL").nullable(),
  facebook: httpUrl((url) => /(^|\.)facebook\.com$/.test(url.hostname), "not a Facebook URL").nullable(),
  hours: z.object({ raw: z.string().min(1), source: z.enum(["osm", "override", "web"]) }).nullable(),
  fee: z.literal("free").nullable(),
  amenities: z.partialRecord(z.enum(AMENITY_KEYS), z.literal(true)),
  trust: z.object({
    tier: z.enum(["verified", "corroborated", "listed", "unconfirmed"]),
    score: z.number().min(0).max(100),
    reasons: z.array(z.string().min(1)).min(1),
    sources: z.array(z.enum(["osm", "overture", "web"])).min(1),
    lastSeen: Day.nullable(),
    stale: z.boolean(),
    verifiedAt: Day.nullable(),
  }),
  provenance: z.record(z.string(), z.string().min(1)),
  osmUrl: httpUrl((url) => url.hostname === "www.openstreetmap.org").nullable(),
});

function monthsBefore(day, months) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString().slice(0, 10);
}

/** All gates over an in-memory build. Returns { errors, notes, stats }; exported for tests. */
export function checkBuild({ manifest, gymsText, gymsFile, landmarksText, otherHashed = [], overrides, files = {}, env = process.env }) {
  const errors = [];
  const fail = (message) => errors.push(message);
  const notes = [];

  const payload = JSON.parse(gymsText);
  const gyms = payload.gyms ?? [];
  const ids = new Set();
  const slugs = new Set();
  const aliasOwner = new Map();
  const builtDay = String(manifest.builtAt ?? "").slice(0, 10);

  for (const venue of gyms) {
    const parsed = VenueSchema.safeParse(venue);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      fail(`${venue.id ?? venue.name}: ${issue.path.join(".")}: ${issue.message}`);
      continue;
    }
    if (ids.has(venue.id)) fail(`duplicate id ${venue.id}`);
    if (slugs.has(venue.slug)) fail(`duplicate slug ${venue.slug}`);
    ids.add(venue.id);
    slugs.add(venue.slug);
    if (!isInKenya({ lat: venue.lat, lng: venue.lng })) fail(`${venue.id} outside the Kenya polygon`);
    for (const alias of venue.aliases) {
      if (aliasOwner.has(alias) && aliasOwner.get(alias) !== venue.id) fail(`alias ${alias} claimed by ${aliasOwner.get(alias)} and ${venue.id}`);
      aliasOwner.set(alias, venue.id);
    }

    const { tier, sources, verifiedAt, reasons } = venue.trust;
    if (tier === "verified") {
      const override = overrides ? overrideFor(overrides.venues, venue) : null;
      if (!verifiedAt) fail(`${venue.id} verified without verifiedAt`);
      else if (verifiedAt < monthsBefore(builtDay, 12)) fail(`${venue.id} verified on ${verifiedAt}, older than 12 months`);
      if (overrides && !(override?.verifiedAt && override.verifiedAt === verifiedAt)) fail(`${venue.id} is verified but no data/overrides/venues file confirms ${verifiedAt}`);
    } else {
      if (verifiedAt) fail(`${venue.id} has verifiedAt but tier ${tier}`);
      if (reasons.some((reason) => /verified/i.test(reason))) fail(`${venue.id} (${tier}) uses the word "verified"; only an override may`);
    }
    if (sources.length === 1 && sources[0] === "web" && tier !== "listed" && tier !== "unconfirmed" && tier !== "verified") {
      fail(`${venue.id} is web-research only but tier ${tier}`);
    }
    if (sources.includes("web") && sources.length === 1 && !venue.provenance.evidence && tier !== "verified") fail(`${venue.id} web-only without evidence URLs in provenance`);
  }
  for (const alias of aliasOwner.keys()) {
    if (ids.has(alias)) fail(`alias ${alias} is also a venue id (a merge was missed)`);
  }

  const visible = gyms.filter((venue) => venue.trust?.tier !== "unconfirmed");
  const nairobi = visible.filter((venue) => venue.county === "Nairobi").length;
  if (visible.length < MIN_VISIBLE) fail(`default-visible ${visible.length} < ${MIN_VISIBLE}`);
  if (nairobi < MIN_NAIROBI) fail(`Nairobi default-visible ${nairobi} < ${MIN_NAIROBI}`);

  const previousVisible = manifest.previous?.defaultVisible ?? null;
  if (previousVisible && visible.length < previousVisible * (1 - MAX_DROP)) {
    fail(`default-visible ${visible.length} is more than 15% below the previous build (${previousVisible})`);
  }
  const previousTotal = manifest.previous?.total ?? null;
  if (previousTotal && gyms.length < previousTotal * (1 - MAX_DROP)) {
    fail(`total ${gyms.length} is more than 15% below the previous build (${previousTotal})`);
  }
  if (env.PREVIOUS_TOTAL && gyms.length < Number(env.PREVIOUS_TOTAL) * (1 - MAX_DROP)) {
    fail(`total ${gyms.length} is more than 15% below PREVIOUS_TOTAL ${env.PREVIOUS_TOTAL}`);
  }

  // Manifest agrees with the data.
  const counts = manifest.counts ?? {};
  const tally = (get) => gyms.reduce((acc, venue) => ({ ...acc, [get(venue)]: (acc[get(venue)] ?? 0) + 1 }), {});
  if (counts.total !== gyms.length) fail(`manifest total ${counts.total} != ${gyms.length}`);
  if (counts.defaultVisible !== visible.length) fail(`manifest defaultVisible ${counts.defaultVisible} != ${visible.length}`);
  for (const [tier, n] of Object.entries(tally((venue) => venue.trust.tier))) {
    if (counts.byTier?.[tier] !== n) fail(`manifest byTier.${tier} ${counts.byTier?.[tier]} != ${n}`);
  }
  for (const county of COUNTIES) {
    if (!(county.name in (counts.byCounty ?? {}))) fail(`county ${county.name} missing from manifest.counts.byCounty`);
  }
  for (const [county, n] of Object.entries(tally((venue) => venue.county ?? "none"))) {
    if (county !== "none" && counts.byCounty?.[county] !== n) fail(`manifest byCounty.${county} ${counts.byCounty?.[county]} != ${n}`);
  }

  // Published files.
  if (gymsFile && HASHED.test(gymsFile) && gymsFile !== `gyms.${contentHash(gymsText)}.json`) fail(`${gymsFile} does not match its content hash`);
  if (manifest.gymsPath !== `/data/${gymsFile}`) fail(`manifest.gymsPath ${manifest.gymsPath} does not point at ${gymsFile}`);
  if (otherHashed.length) fail(`stale hashed gyms files left in public/data: ${otherHashed.join(", ")}`);
  const gymsGzip = gzipSync(gymsText).length;
  if (gymsGzip > GYMS_GZIP_BUDGET) fail(`gyms file ${gymsGzip} bytes gzip > ${GYMS_GZIP_BUDGET}`);
  let landmarkCount = 0;
  let landmarksGzip = 0;
  if (landmarksText == null) fail("missing public/data/landmarks.json");
  else {
    const landmarks = JSON.parse(landmarksText).landmarks ?? [];
    landmarkCount = landmarks.length;
    landmarksGzip = gzipSync(landmarksText).length;
    if (landmarksGzip > LANDMARK_GZIP_BUDGET) fail(`landmarks ${landmarksGzip} bytes gzip > ${LANDMARK_GZIP_BUDGET}`);
    if (!landmarks.length) fail("landmarks.json is empty");
    for (const place of landmarks) {
      if (!place.name || !isInKenya({ lat: place.lat, lng: place.lng })) fail(`landmark ${place.id} has no name or is outside Kenya`);
    }
  }

  // Licence notices: manifest, LICENSE-DATA.md and NOTICE all carry what the data needs.
  const licenseText = (manifest.licenses ?? []).join("\n");
  const required = [["ODbL", /ODbL/], ["CDLA-Permissive-2.0", /CDLA-Permissive-2\.0/], ["GeoNames CC BY 4.0", /GeoNames/]];
  if (/Foursquare/.test(licenseText)) required.push(["Apache-2.0", /Apache-2\.0/]);
  if (!(manifest.licenses ?? []).length) fail("manifest has no licenses");
  if (!(manifest.notices ?? []).length) fail("manifest has no notices");
  for (const [label, pattern] of required) if (!pattern.test(licenseText)) fail(`manifest.licenses missing ${label}`);
  for (const [label, text] of Object.entries(files)) {
    if (text == null) { fail(`missing ${label}`); continue; }
    for (const [need, pattern] of [["OpenStreetMap", /OpenStreetMap/], ["Overture", /Overture/], ["CDLA", /CDLA|Community Data License/], ["GeoNames", /GeoNames/], ...(/Foursquare/.test(licenseText) ? [["Foursquare", /Foursquare/], ["Apache", /Apache/]] : []), ...(/CC0/.test(licenseText) ? [["CC0", /CC0|Creative Commons Zero/]] : [])]) {
      if (!pattern.test(text)) fail(`${label} does not mention ${need}`);
    }
  }

  const withContact = visible.filter((venue) => venue.phones.length || venue.website || venue.whatsapp).length;
  const contactPct = visible.length ? Math.round((1000 * withContact) / visible.length) / 10 : 0;
  notes.push(`targets: visible>=400 ${visible.length >= 400 ? "met" : "NOT met"}, contact>=75% ${contactPct >= 75 ? "met" : "NOT met"} (${contactPct}%)`);
  return {
    errors,
    notes,
    stats: { total: gyms.length, visible: visible.length, nairobi, gymsGzip, landmarkCount, landmarksGzip, contactPct },
  };
}

function read(file) {
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}

function main() {
  const manifestText = read(path.join(PUBLIC_DATA, "manifest.json"));
  if (!manifestText) throw new Error("missing public/data/manifest.json (run npm run data:build)");
  const manifest = JSON.parse(manifestText);
  const gymsFile = path.basename(manifest.gymsPath ?? "");
  const gymsText = read(path.join(PUBLIC_DATA, gymsFile));
  if (!gymsText) throw new Error(`missing ${manifest.gymsPath}`);
  const overrides = loadOverrides(path.join(ROOT, "data", "overrides")); // Zod; throws on an invalid file
  const { errors, notes, stats } = checkBuild({
    manifest,
    gymsText,
    gymsFile,
    landmarksText: read(path.join(PUBLIC_DATA, "landmarks.json")),
    otherHashed: readdirSync(PUBLIC_DATA).filter((file) => HASHED.test(file) && file !== gymsFile),
    overrides,
    files: { "LICENSE-DATA.md": read(path.join(ROOT, "LICENSE-DATA.md")), NOTICE: read(path.join(ROOT, "NOTICE")) },
  });
  if (errors.length) {
    console.error(`${errors.length} gate(s) failed:\n${errors.slice(0, 40).map((e) => `  - ${e}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`ok venues=${stats.total} visible=${stats.visible} nairobi=${stats.nairobi} gzip=${stats.gymsGzip} landmarks=${stats.landmarkCount} (${stats.landmarksGzip} gzip)`);
  for (const note of notes) console.log(note);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
