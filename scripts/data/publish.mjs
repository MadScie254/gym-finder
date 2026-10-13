/**
 * Writing the published files: content-hashed gyms file, atomic writes, and the
 * previous published build (for old-slug aliases and the "not >15% below" gate).
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const HASHED = /^gyms\.[a-f0-9]{10}\.json$/;
/** A slug as slugify() writes it; anything else in `aliases` (an id, a name) is not an old slug. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{4,}$/;

export const contentHash = (body) => createHash("sha256").update(body).digest("hex").slice(0, 10);

export async function writeAtomic(file, text) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await writeFile(tmp, text);
  await rename(tmp, file);
}

/** Writes gyms.<hash>.json, then removes every other hashed gyms file so only the current one remains. */
export async function publishGyms(publicDir, body) {
  const name = `gyms.${contentHash(body)}.json`;
  await writeAtomic(path.join(publicDir, name), body);
  for (const file of await readdir(publicDir)) {
    if (HASHED.test(file) && file !== name) await unlink(path.join(publicDir, file));
  }
  return name;
}

/** The currently published build, or null. Read BEFORE publishing replaces it. */
export function loadPrevious(publicDir) {
  const manifestPath = path.join(publicDir, "manifest.json");
  if (!existsSync(manifestPath)) return null;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const gymsFile = path.join(publicDir, path.basename(manifest.gymsPath ?? ""));
  const gyms = manifest.gymsPath && existsSync(gymsFile) ? JSON.parse(readFileSync(gymsFile, "utf8")).gyms ?? [] : [];
  return { manifest, gyms };
}

/**
 * Old slugs that must keep working, as Map(venue id -> slugs). An old venue's slug (and
 * the old slugs it carried) go to the venue that now has its id, else to the one venue
 * that absorbed it as an alias. A split (one old record now several venues) is ambiguous
 * and is not carried; a slug can never belong to two venues.
 */
export function carrySlugs(previous, venues) {
  const carried = new Map();
  if (!previous?.gyms.length) return carried;
  const byId = new Map(venues.map((venue) => [venue.id, venue]));
  const slugs = new Set(venues.map((venue) => venue.slug));
  for (const old of previous.gyms) {
    let owner = byId.get(old.id);
    if (!owner) {
      const absorbers = venues.filter((venue) => venue.aliases.includes(old.id));
      owner = absorbers.length === 1 ? absorbers[0] : null;
    }
    if (!owner) continue;
    const mine = carried.get(owner.id) ?? new Set();
    for (const slug of [old.slug, ...(old.aliases ?? []).filter((alias) => SLUG.test(alias))]) {
      if (slug !== owner.slug && !slugs.has(slug)) mine.add(slug);
    }
    carried.set(owner.id, mine);
  }
  // Two old venues merged into one keep both slugs; a slug claimed by two owners is dropped.
  const claims = new Map();
  for (const [id, set] of carried) for (const slug of set) claims.set(slug, [...(claims.get(slug) ?? []), id]);
  for (const [slug, owners] of claims) {
    if (owners.length > 1) for (const id of owners) carried.get(id).delete(slug);
  }
  return new Map([...carried].map(([id, set]) => [id, [...set].sort().slice(0, 8)]));
}

/** What the next manifest records about the last DIFFERENT build (so a rebuild of identical inputs is a no-op). */
export function previousSummary(previous, gymsPath) {
  if (!previous) return null;
  if (previous.manifest.gymsPath === gymsPath) return previous.manifest.previous ?? null;
  const { counts = {} } = previous.manifest;
  return {
    builtAt: previous.manifest.builtAt ?? null,
    gymsPath: previous.manifest.gymsPath ?? null,
    total: counts.total ?? previous.gyms.length,
    defaultVisible: counts.defaultVisible ?? previous.gyms.filter((v) => v.trust?.tier !== "unconfirmed").length,
  };
}
