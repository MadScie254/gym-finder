/**
 * Name similarity, dedupe rules and clustering (brief 5.4).
 *
 * Two records are the same venue when ANY hold:
 *   (d) a forced pair in data/overrides/merge.json
 *   (c) within 150 m AND name-token Jaccard >= 0.5 (stop-words stripped)
 *   (a) same normalised phone      } only when the records are also close: a shared number
 *   (b) same own-domain website    } or site far apart means branches of one chain, not one venue
 * Proximity alone NEVER merges. Pairs within 60 m with no name/phone/website agreement
 * are returned as review candidates for a human (data/source/review-candidates.json).
 */
import { createHash } from "node:crypto";
import { hostOf, isSocialOrAggregatorHost, sameWebsiteHost } from "./urls.mjs";

export { sameWebsiteHost };

const STOP = new Set(["gym", "fitness", "centre", "center", "club", "ltd", "limited", "the", "and", "health", "studio"]);
const SMALL_WORDS = new Set(["and", "for", "the", "of", "in", "at", "on", "to", "by"]);

/** Distance within which name similarity may confirm a duplicate (brief 5.4 rule c). */
export const NAME_MATCH_METRES = 150;
export const NAME_MATCH_JACCARD = 0.5;
/** Within this distance a shared phone or website alone confirms the same premises. */
export const SHARED_CONTACT_NEAR_M = 150;
/** Beyond this a shared phone or website never merges (chain branches share numbers and sites). */
export const SHARED_CONTACT_MAX_M = 2000;
/** Proximity-only review window. */
export const REVIEW_METRES = 60;

export function normalizeName(value) {
  return `${value ?? ""}`.normalize("NFKC").replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

/** Trim, collapse whitespace, drop underscores, and sentence-case ALL-CAPS names. Empty in, empty out. */
export function displayName(value) {
  const name = normalizeName(value);
  if (!name) return "";
  const letters = name.replace(/[^\p{L}]/gu, "");
  const allCaps = name === name.toUpperCase() && name !== name.toLowerCase();
  // A lone short word (DOJO, KICC) is as likely an acronym as shouting; leave it.
  if (!allCaps || (!/\s/.test(name) && letters.length <= 5)) return name;
  return name
    .split(" ")
    .map((word, index) => {
      if (/\d/.test(word) || (word.length > 1 && !/[aeiouyAEIOUY]/.test(word))) return word; // 24/7, L24, CNC
      const lower = word.toLowerCase();
      if (index > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.replace(/(^|[-/(&])(\p{L})/gu, (_, lead, ch) => lead + ch.toUpperCase());
    })
    .join(" ");
}

export function nameTokens(value) {
  return new Set(
    normalizeName(value)
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((token) => token && !STOP.has(token)),
  );
}

export function tokenJaccard(a, b) {
  const left = nameTokens(a);
  const right = nameTokens(b);
  if (left.size === 0 && right.size === 0) {
    // Names made only of stop-words ("Fitness Centre"): equal full names agree, nothing else does.
    const plain = (value) => normalizeName(value).toLowerCase().replace(/\bthe\b/g, "").replace(/\bcentre\b/g, "center")
      .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    return plain(a) && plain(a) === plain(b) ? 1 : 0;
  }
  if (left.size === 0 || right.size === 0) return 0;
  let inter = 0;
  for (const token of left) if (right.has(token)) inter += 1;
  return inter / new Set([...left, ...right]).size;
}

export function haversineM(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sine = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(sine)));
}

export const pairKey = (a, b) => [a, b].sort().join("|");

function forcedSet(forcedPairs) {
  return forcedPairs instanceof Set ? forcedPairs : new Set(forcedPairs ?? []);
}

function sharedPhone(left, right) {
  const phones = new Set(left.phones ?? []);
  return (right.phones ?? []).some((phone) => phones.has(phone));
}

function sharedSite(left, right) {
  return Boolean(left.website && right.website && sameWebsiteHost(left.website, right.website));
}

/** Records the build can place precisely (OSM, Overture); web-research ones carry approxRadiusM instead. */
const isPrecise = (record) => !record.approxRadiusM;

/** @returns {{ merge: boolean, reason?: string, metres?: number, similarity?: number }} */
export function shouldMerge(left, right, forcedPairs = []) {
  if (forcedSet(forcedPairs).has(pairKey(left.id, right.id))) return { merge: true, reason: "override" };
  if (!isPrecise(left) || !isPrecise(right)) return approxMatch(left, right);
  const metres = haversineM(left, right);
  const similarity = tokenJaccard(left.name, right.name);
  if (metres <= NAME_MATCH_METRES && similarity >= NAME_MATCH_JACCARD) return { merge: true, reason: "name+distance", metres, similarity };
  const phone = sharedPhone(left, right);
  const site = sharedSite(left, right);
  if (phone || site) {
    const reason = phone ? "phone" : "website";
    if (metres <= SHARED_CONTACT_NEAR_M) return { merge: true, reason, metres, similarity };
    if (metres <= SHARED_CONTACT_MAX_M && similarity >= NAME_MATCH_JACCARD) return { merge: true, reason: `${reason}+name`, metres, similarity };
  }
  return { merge: false, metres, similarity };
}

const seedKey = (value) => `${value ?? ""}`.trim().replace(/^(?:gers|overture|osm|web):/i, "").replace(/^(?:node|way|relation)\//, "").toLowerCase();

/**
 * Matching where one side only has an approximate location (web research gives an area
 * or town, not coordinates). The distance test uses the location's uncertainty radius.
 * A seedId link (the research file says which source record it describes) is exact.
 */
export function approxMatch(left, right) {
  for (const [web, other] of [[left, right], [right, left]]) {
    if (web.seedId && seedKey(web.seedId) === seedKey(other.id)) return { merge: true, reason: "seed-id" };
  }
  const radius = Math.max(left.approxRadiusM ?? 0, right.approxRadiusM ?? 0);
  const metres = haversineM(left, right);
  if (metres > radius + SHARED_CONTACT_MAX_M / 2) return { merge: false, metres };
  const similarity = tokenJaccard(left.name, right.name);
  if (sharedPhone(left, right)) return { merge: true, reason: "phone", metres, similarity };
  if (sharedSite(left, right)) return { merge: true, reason: "website", metres, similarity };
  if (metres <= radius && similarity >= NAME_MATCH_JACCARD) return { merge: true, reason: "name+area", metres, similarity };
  return { merge: false, metres, similarity };
}

/** Within 60 m, no name/phone/website agreement: a person must decide. Never merged. */
export function isProximityOnlyCandidate(left, right) {
  if (!isPrecise(left) || !isPrecise(right)) return false;
  if (haversineM(left, right) > REVIEW_METRES) return false;
  if (sharedPhone(left, right) || sharedSite(left, right)) return false;
  return tokenJaccard(left.name, right.name) < NAME_MATCH_JACCARD;
}

/**
 * Group records into venues by union-find over pairwise decisions.
 * `ghosts` (records already removed by the deny-list or excludes) take part in the
 * review-candidate scan only, so a human sees e.g. an OSM gym next to a deny-listed shop.
 * @returns {{ clusters: object[][], review: object[], merges: { a: string, b: string, reason: string }[] }}
 */
export function clusterRecords(records, { forcedPairs = [], ghosts = [] } = {}) {
  const forced = forcedSet(forcedPairs);
  const parent = records.map((_, index) => index);
  const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const merges = [];
  for (let i = 0; i < records.length; i += 1) {
    for (let j = i + 1; j < records.length; j += 1) {
      const decision = shouldMerge(records[i], records[j], forced);
      if (!decision.merge) continue;
      merges.push({ a: records[i].id, b: records[j].id, reason: decision.reason });
      const [ri, rj] = [find(i), find(j)];
      if (ri !== rj) parent[Math.max(ri, rj)] = Math.min(ri, rj);
    }
  }
  const groups = new Map();
  records.forEach((record, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(record);
  });

  const review = [];
  const everyone = [...records.map((record, index) => ({ record, root: find(index), ghost: false })),
    ...ghosts.map((record) => ({ record, root: null, ghost: true }))];
  for (let i = 0; i < everyone.length; i += 1) {
    for (let j = i + 1; j < everyone.length; j += 1) {
      const [x, y] = [everyone[i], everyone[j]];
      if (x.root !== null && x.root === y.root) continue;
      if (x.ghost && y.ghost) continue;
      if (forced.has(pairKey(x.record.id, y.record.id)) || !isProximityOnlyCandidate(x.record, y.record)) continue;
      review.push({
        a: x.record.id,
        b: y.record.id,
        aName: x.record.name,
        bName: y.record.name,
        metres: Math.round(haversineM(x.record, y.record)),
        aSources: x.record.sources,
        bSources: y.record.sources,
        ...(x.ghost || y.ghost ? { removedBy: (x.ghost ? x.record : y.record).removedBy ?? "removed" } : {}),
      });
    }
  }
  const rank = (pair) => (pair.aSources.includes("osm") || pair.bSources.includes("osm") ? 0 : 1);
  review.sort((p, q) => rank(p) - rank(q) || p.metres - q.metres || p.a.localeCompare(q.a) || p.b.localeCompare(q.b));
  return { clusters: [...groups.values()], review, merges };
}

/** Slug = slugify(name) + "-" + 4 hex chars of sha1(id). `extra` lengthens the hash on a collision. */
export function slugify(name, id, extra = 0) {
  const base = normalizeName(name)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 48)
    .replace(/-+$/, "") || "gym";
  const hash = createHash("sha1").update(`${id}`).digest("hex");
  return `${base}-${hash.slice(0, 4 + extra)}`;
}

export { hostOf, isSocialOrAggregatorHost };
