/**
 * Trust tiers (brief 5.5), the "no guesswork" mechanism. Pure function of the merged
 * record, the override (if any) and an as-of date, so a build is reproducible.
 *
 *   verified     only from data/overrides/venues/<slug>.json with verifiedAt <= 12 months old
 *   corroborated two independent sources (OSM, Overture, or web research that cites the
 *                venue's own/official page); or Overture confidence >= 0.85 with a phone or
 *                website, updated <= 24 months ago
 *   listed       one source: Overture confidence >= 0.5 updated <= 36 months ago, a named
 *                OSM venue, or a web-research find (never corroborated on web evidence alone)
 *   unconfirmed  everything else, and anything whose name does not read as a gym:
 *                hidden from default browse/map/sitemap, still found by exact name
 *
 * `score` is internal (tie-breaks, tests) and is never shown to users.
 * Recency of a source whose date is unknown (an OSM node without check_date) is not
 * counted against it: we cannot say it is old, and we do not invent a date.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const toDate = (value) => (value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T00:00:00Z`));

/** Today (UTC) unless BUILD_AS_OF pins the build date. */
export function buildDate(env = process.env) {
  const pinned = env.BUILD_AS_OF;
  if (pinned && Number.isFinite(Date.parse(pinned))) return new Date(pinned).toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function monthsBefore(asOf, months) {
  const date = toDate(asOf);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString().slice(0, 10);
}

/** True when `iso` is known and no older than `months` before asOf (and not in the future). */
function within(iso, months, asOf) {
  if (!iso) return false;
  const day = String(iso).slice(0, 10);
  return day >= monthsBefore(asOf, months) && day <= toDate(asOf).toISOString().slice(0, 10);
}

export function formatMonth(iso) {
  const date = toDate(iso);
  return Number.isNaN(date.getTime()) ? null : `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function formatDay(iso) {
  const date = toDate(iso);
  return Number.isNaN(date.getTime()) ? null : `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

const DATASET_NAMES = { meta: "Meta", foursquare: "Foursquare", microsoft: "Microsoft", alltheplaces: "AllThePlaces" };
function datasetPhrase(datasets) {
  const names = [...new Set((datasets ?? []).map((d) => DATASET_NAMES[d] ?? d))];
  if (!names.length) return "";
  const joined = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
  return ` (${joined} business data)`;
}

function sourceReason(venue, hasOsm, hasOverture, hasWebSource) {
  const parts = [];
  if (hasOsm && hasOverture) parts.push(`Seen in OpenStreetMap and Overture Maps${datasetPhrase(venue.overtureDatasets)}`);
  else if (hasOsm) parts.push("Mapped in OpenStreetMap");
  else if (hasOverture) parts.push(`Listed in Overture Maps${datasetPhrase(venue.overtureDatasets)}`);
  if (hasWebSource) {
    const when = formatDay(venue.web?.researchAt);
    parts.push(hasOsm || hasOverture
      ? `Official page found in web research${when ? ` on ${when}` : ""}`
      : `Found by web research${when ? ` on ${when}` : ""}; not independently confirmed`);
  }
  return parts.join(". ");
}

function contactReason(venue) {
  const phone = (venue.phones ?? []).length > 0;
  const site = Boolean(venue.website);
  if (phone && site) return "Phone and website listed";
  if (phone) return "Phone listed";
  if (site) return "Website listed";
  return "No phone or website listed";
}

const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));

/**
 * @param {object} venue merged internal record (sources, overtureConfidence, lastSeen, ...)
 * @param {object | null | undefined} override data/overrides/venues/<slug>.json content
 * @param {{ asOf?: string | Date }} [options]
 */
export function computeTrust(venue, override, { asOf = buildDate() } = {}) {
  const sources = [...new Set(venue.sources ?? [])].sort();
  const hasOsm = sources.includes("osm");
  const hasOverture = sources.includes("overture");
  const hasWebSource = sources.includes("web");
  const lastSeen = venue.lastSeen ?? null;
  const stale = lastSeen ? !within(lastSeen, 24, asOf) : false;
  const hasContact = Boolean((venue.phones ?? []).length || venue.website);
  const confidence = venue.overtureConfidence ?? 0;
  const common = { sources, lastSeen, stale };

  const reasonsFor = (...lead) => {
    const reasons = [...lead, contactReason(venue)];
    if (venue.approxRadiusM) reasons.push(`Map pin is approximate: centre of ${venue.area ?? venue.town ?? "the area"}, not the exact address`);
    if (lastSeen) reasons.push(`Updated ${formatMonth(lastSeen)}`);
    if (stale) reasons.push("May be outdated: no update in over 24 months");
    return reasons.filter(Boolean);
  };

  if (override?.verifiedAt && !override.closed && within(override.verifiedAt, 12, asOf)) {
    const how = { phone: " by phone", visit: " by visiting", owner: " with the owner" }[override.verification] ?? "";
    return {
      tier: "verified",
      score: 95,
      reasons: [`Confirmed by Find My Gym${how} on ${formatDay(override.verifiedAt)}`, ...reasonsFor(sourceReason(venue, hasOsm, hasOverture, hasWebSource))],
      ...common,
      verifiedAt: override.verifiedAt,
    };
  }

  if (venue.softDeny) {
    return {
      tier: "unconfirmed",
      score: 10,
      reasons: [`Name suggests a ${venue.softDeny}, not a gym: shown only when you search its exact name`, sourceReason(venue, hasOsm, hasOverture, hasWebSource)].filter(Boolean),
      ...common,
      verifiedAt: null,
    };
  }

  const independent = sources.length;
  const overtureFresh24 = within(venue.overtureUpdatedAt ?? (hasOverture && !hasOsm ? lastSeen : null), 24, asOf);
  if (independent >= 2 || (hasOverture && confidence >= 0.85 && hasContact && overtureFresh24)) {
    const lead = independent >= 2
      ? sourceReason(venue, hasOsm, hasOverture, hasWebSource)
      : `High-confidence listing in Overture Maps${datasetPhrase(venue.overtureDatasets)}`;
    return {
      tier: "corroborated",
      score: clamp(Math.min(90, 55 + 8 * Math.min(independent, 3) + confidence * 10 + (hasContact ? 5 : 0))),
      reasons: reasonsFor(lead),
      ...common,
      verifiedAt: null,
    };
  }

  const overtureOk = hasOverture && confidence >= 0.5 && within(venue.overtureUpdatedAt ?? lastSeen, 36, asOf);
  const osmOk = hasOsm && Boolean(venue.name) && (!venue.osmUpdatedAt || within(venue.osmUpdatedAt, 36, asOf));
  const webOnlyOk = hasWebSource && !hasOsm && !hasOverture;
  if (overtureOk || osmOk || webOnlyOk) {
    return {
      tier: "listed",
      score: clamp(35 + confidence * 15 + (hasContact ? 8 : 0) + (osmOk ? 5 : 0)),
      reasons: [...reasonsFor(sourceReason(venue, hasOsm, hasOverture, hasWebSource)), "Call to confirm hours and price"],
      ...common,
      verifiedAt: null,
    };
  }

  return {
    tier: "unconfirmed",
    score: clamp(5 + confidence * 15),
    reasons: [
      hasOverture && confidence < 0.5
        ? "Low-confidence listing in Overture Maps: hidden from default browse, shown when you search its exact name"
        : "Sparse or old source data: hidden from default browse, shown when you search its exact name",
      contactReason(venue),
      ...(lastSeen ? [`Updated ${formatMonth(lastSeen)}`] : []),
    ],
    ...common,
    verifiedAt: null,
  };
}
