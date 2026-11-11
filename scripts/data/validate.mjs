import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { COUNTIES, isInKenya } from "./geo.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PUBLIC_DATA = path.join(ROOT, "public", "data");

const Venue = z.object({
  id: z.string(),
  slug: z.string(),
  aliases: z.array(z.string()),
  name: z.string().min(1),
  kind: z.enum(["gym", "crossfit", "yoga", "pilates", "martial_arts", "boxing", "gymnastics", "boot_camp"]),
  lat: z.number().finite(),
  lng: z.number().finite(),
  area: z.string().nullable(),
  town: z.string().nullable(),
  county: z.string().nullable(),
  address: z.string().nullable(),
  phones: z.array(z.string().regex(/^\+254\d{7,9}$/)),
  whatsapp: z.string().regex(/^\+254\d{7,9}$/).nullable(),
  website: z.string().url().nullable(),
  instagram: z.string().url().nullable(),
  facebook: z.string().url().nullable(),
  hours: z.object({ raw: z.string(), source: z.enum(["osm", "override"]) }).nullable(),
  fee: z.enum(["free"]).nullable(),
  amenities: z.record(z.string(), z.literal(true)),
  trust: z.object({
    tier: z.enum(["verified", "corroborated", "listed", "unconfirmed"]),
    score: z.number(),
    reasons: z.array(z.string()),
    sources: z.array(z.string()),
    lastSeen: z.string().nullable(),
    stale: z.boolean(),
    verifiedAt: z.string().nullable(),
  }),
  provenance: z.record(z.string(), z.string()),
  osmUrl: z.string().url().nullable(),
});

const errors = [];
function fail(message) {
  errors.push(message);
}

function main() {
  const manifestPath = path.join(PUBLIC_DATA, "manifest.json");
  if (!existsSync(manifestPath)) throw new Error("missing public/data/manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const gymsFile = path.join(ROOT, "public", manifest.gymsPath.replace(/^\//, ""));
  if (!existsSync(gymsFile)) throw new Error(`missing ${manifest.gymsPath}`);
  const payload = JSON.parse(readFileSync(gymsFile, "utf8"));
  const gyms = payload.gyms ?? [];

  const ids = new Set();
  const slugs = new Set();
  for (const venue of gyms) {
    const parsed = Venue.safeParse(venue);
    if (!parsed.success) fail(`${venue.id ?? venue.name}: ${parsed.error.issues[0]?.message}`);
    if (ids.has(venue.id)) fail(`duplicate id ${venue.id}`);
    if (slugs.has(venue.slug)) fail(`duplicate slug ${venue.slug}`);
    ids.add(venue.id);
    slugs.add(venue.slug);
    if (venue.address === "Kenya") fail(`${venue.id} address is Kenya`);
    if (!isInKenya({ lat: venue.lat, lng: venue.lng })) fail(`${venue.id} outside Kenya`);
    if (venue.trust.tier === "verified" && !venue.trust.verifiedAt) fail(`${venue.id} verified without verifiedAt`);
  }

  if (gyms.length < 350) fail(`total ${gyms.length} < 350`);
  const nairobi = gyms.filter((v) => v.county === "Nairobi" && v.trust.tier !== "unconfirmed").length;
  if (nairobi < 150) fail(`Nairobi visible ${nairobi} < 150`);
  for (const county of COUNTIES) {
    if (!(county.name in (manifest.counts?.byCounty ?? {}))) fail(`county ${county.name} missing from manifest`);
  }
  if (!manifest.licenses?.length) fail("manifest missing licenses");

  const gz = gzipSync(readFileSync(gymsFile)).length;
  if (gz > 150 * 1024) fail(`gyms.json gzip ${gz} > 150KB`);

  const previous = process.env.PREVIOUS_TOTAL ? Number(process.env.PREVIOUS_TOTAL) : null;
  if (previous && gyms.length < previous * 0.85) fail(`total ${gyms.length} is >15% below previous ${previous}`);

  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log(`ok venues=${gyms.length} gzip=${gz} nairobi=${nairobi}`);
}

main();
