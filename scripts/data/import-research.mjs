/**
 * Source family "web": venues found by the web-research workflow
 * (data/research/venues-researched.json, optional; the build works without it).
 *
 *  - Each researched venue becomes a record with source "web"; its evidence URLs stay in
 *    provenance. It then goes through the normal merge rules (assemble.mjs).
 *  - status "closed" removes the venue (also the OSM/Overture record it matches);
 *    "uncertain" and unrecognised statuses are never imported.
 *  - A venue that matches nothing enters as tier "listed" with reasons saying it comes
 *    from web research and when. Web evidence alone is never "corroborated" or "verified".
 *  - Web evidence counts as an additional independent source only when an evidence page
 *    is the venue's own website or its official social profile (see hasOfficialEvidence).
 *  - The file has no coordinates, so a new venue is placed at the centre of its suburb
 *    (2 km uncertainty) or town (8 km) from data/kenya-places.json, flagged as approximate
 *    in provenance and in the trust reasons. No place match: not imported, logged.
 *  - hoursText is carried as raw text with source "web"; web data only fills gaps.
 */
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";
import { assignCounty, countyFromText, isInKenya, placeCentre } from "./geo.mjs";
import { displayName } from "./merge-rules.mjs";
import { VENUE_KINDS, cleanAddress, isoDate, kindOf } from "./normalize.mjs";
import { normalizePhones, whatsappChoice } from "./phones.mjs";
import { canonicalUrl, classifyUrls, hostOf } from "./urls.mjs";

export const AREA_RADIUS_M = 2000;
export const TOWN_RADIUS_M = 8000;
const COORD_RADIUS_M = 250;

const Evidence = z.looseObject({
  url: z.string().nullish(),
  fetched: z.union([z.boolean(), z.string(), z.number()]).nullish(),
  quote: z.string().nullish(),
  supports: z.array(z.string()).nullish(),
});

export const ResearchedVenue = z.looseObject({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.string().nullish(),
  county: z.string().nullish(),
  town: z.string().nullish(),
  area: z.string().nullish(),
  address: z.string().nullish(),
  phones: z.array(z.string()).nullish(),
  website: z.string().nullish(),
  social: z.array(z.union([z.string(), z.looseObject({ url: z.string() })])).nullish(),
  hoursText: z.string().nullish(),
  access: z.string().nullish(),
  status: z.string().nullish(),
  inSeed: z.boolean().nullish(),
  seedId: z.string().nullish(),
  evidence: z.array(Evidence).nullish(),
  verifiedAt: z.string().nullish(),
  notes: z.string().nullish(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
});

/** "open" | "closed" | "uncertain". Only an explicit open status is imported. */
export function researchStatus(status) {
  const text = `${status ?? ""}`.toLowerCase().replace(/[\s_-]+/g, " ").trim();
  if (/^(?:permanently )?closed(?: down)?$|^permanently closed$|^defunct$/.test(text)) return "closed";
  if (/^(?:open|operating|active|trading)\b/.test(text) && !/temporar|unclear|uncertain|not /.test(text)) return "open";
  return "uncertain";
}

/** null when the file is absent; throws on a file that exists but is not valid JSON. */
export function loadResearch(file) {
  if (!file || !existsSync(file)) return null;
  let payload;
  try {
    payload = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${file}: not valid JSON (${error.message})`);
  }
  if (!payload || !Array.isArray(payload.venues)) throw new Error(`${file}: expected { generatedAt, venues: [...] }`);
  return payload;
}

/** facebook.com/<page> or instagram.com/<handle>, so a page's sub-pages (/about, /posts) still count as the page. */
function profileKey(url) {
  const parsed = canonicalUrl(url);
  if (!parsed) return null;
  const first = parsed.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  if (!first) return null;
  const id = first === "profile.php" ? `?id=${parsed.searchParams.get("id")}` : "";
  return `${parsed.hostname.replace(/^(?:www|m)\./, "")}/${first}${id}`;
}

/**
 * True when at least one evidence entry was fetched, quotes the page, and is the venue's
 * own website (same host) or a page of its official Facebook/Instagram profile. A listicle,
 * directory or news page never counts.
 */
export function hasOfficialEvidence(evidence, urls) {
  const siteHost = urls.website ? hostOf(urls.website) : null;
  const profiles = [urls.facebook, urls.instagram].filter(Boolean).map(profileKey);
  return (evidence ?? []).some((entry) => {
    if (!entry.url || !entry.fetched || !`${entry.quote ?? ""}`.trim()) return false;
    if (siteHost && hostOf(entry.url) === siteHost) return true;
    const key = profileKey(entry.url);
    return Boolean(key) && profiles.includes(key);
  });
}

function locate(v) {
  if (Number.isFinite(v.lat) && Number.isFinite(v.lng) && isInKenya({ lat: v.lat, lng: v.lng })) {
    return { lat: v.lat, lng: v.lng, radius: COORD_RADIUS_M, label: "web" };
  }
  const area = v.area ? placeCentre(v.area, "suburb") ?? placeCentre(v.area) : null;
  if (area) return { lat: area.lat, lng: area.lng, radius: AREA_RADIUS_M, label: `web:approx-${area.kind === "town" ? "town" : "area"}` };
  const town = v.town ? placeCentre(v.town, "town") ?? placeCentre(v.town) : null;
  if (town) return { lat: town.lat, lng: town.lng, radius: TOWN_RADIUS_M, label: "web:approx-town" };
  return null;
}

const womenOnly = (access) => /\b(?:women|ladies|females?)s?[- ]only\b|\bonly (?:for )?(?:women|ladies|females?)\b/i.test(access ?? "");

/**
 * Convert a research payload into internal records.
 * @returns {{ records: object[], skipped: { id: string, name?: string, reason: string }[], researchAt: string | null, counts: object }}
 */
export function researchToRecords(payload, { asOf } = {}) {
  const records = [];
  const skipped = [];
  const counts = { total: 0, imported: 0, closed: 0, uncertain: 0, invalid: 0, unplaced: 0 };
  const researchAt = isoDate(payload?.generatedAt) ?? asOf ?? null;

  for (const raw of payload?.venues ?? []) {
    counts.total += 1;
    const parsed = ResearchedVenue.safeParse(raw);
    if (!parsed.success) {
      counts.invalid += 1;
      skipped.push({ id: String(raw?.id ?? "?"), name: raw?.name, reason: `invalid: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}` });
      continue;
    }
    const v = parsed.data;
    const status = researchStatus(v.status);
    if (status === "uncertain") {
      counts.uncertain += 1;
      skipped.push({ id: v.id, name: v.name, reason: `status "${v.status ?? ""}" is not an explicit open/closed finding` });
      continue;
    }
    const name = displayName(v.name);
    if (!name) {
      counts.invalid += 1;
      skipped.push({ id: v.id, reason: "empty name" });
      continue;
    }

    const place = locate(v);
    if (!place && status === "open") {
      counts.unplaced += 1;
      skipped.push({ id: v.id, name, reason: "no coordinates and no area/town found in data/kenya-places.json" });
      continue;
    }

    const urls = classifyUrls([v.website, ...(v.social ?? []).map((item) => (typeof item === "string" ? item : item.url))].filter(Boolean));
    const { phones, dropped, types } = normalizePhones(v.phones ?? []);
    const evidence = (v.evidence ?? []).filter((entry) => entry.url).map((entry) => entry.url);
    const official = hasOfficialEvidence(v.evidence, urls);
    const county = place ? assignCounty(place, [v.county, v.town]) : { name: countyFromText(v.county)?.name ?? null, by: "hint" };
    const when = isoDate(v.verifiedAt) ?? researchAt;
    const hours = `${v.hoursText ?? ""}`.trim();
    const address = cleanAddress(v.address);
    const wa = whatsappChoice(phones, null);
    const amenities = womenOnly(v.access) ? { women_only: true } : {};
    const stated = `${v.kind ?? ""}`.toLowerCase().trim().replace(/[\s-]+/g, "_");
    const kind = VENUE_KINDS.includes(stated) ? stated : kindOf(name);
    const id = v.id.startsWith("web:") ? v.id : `web:${v.id}`;

    records.push({
      id,
      name,
      nameRaw: v.name,
      kind,
      lat: place?.lat ?? null,
      lng: place?.lng ?? null,
      approxRadiusM: place?.radius ?? 0,
      address,
      area: v.area?.trim() || null,
      town: v.town?.trim() || null,
      county: county.name,
      countyBy: county.by,
      phones,
      phoneTypes: types,
      droppedPhones: dropped,
      whatsapp: wa?.number ?? null,
      whatsappSource: wa ? "derived:mobile-phone" : null,
      website: urls.website,
      instagram: urls.instagram,
      facebook: urls.facebook,
      hours: hours ? { raw: hours, source: "web" } : null,
      fee: null,
      amenities,
      sources: ["web"],
      overtureConfidence: null,
      overtureDatasets: [],
      overtureUpdatedAt: null,
      osmUpdatedAt: null,
      lastSeen: when,
      provenance: {
        name: "web",
        location: place?.label ?? "web",
        ...(address ? { address: "web" } : {}),
        ...(phones.length ? { phone: "web" } : {}),
        ...(wa ? { whatsapp: "derived:mobile-phone" } : {}),
        ...(urls.website ? { website: "web" } : {}),
        ...(urls.instagram ? { instagram: "web" } : {}),
        ...(urls.facebook ? { facebook: "web" } : {}),
        ...(hours ? { hours: "web" } : {}),
        ...(Object.keys(amenities).length ? { amenities: "web" } : {}),
      },
      osmUrl: null,
      aliases: [],
      softDeny: null,
      web: { researchAt: when, official, evidence: evidence.slice(0, 3), closed: status === "closed" },
      seedId: v.inSeed && v.seedId ? v.seedId : null,
    });
    if (status === "closed") counts.closed += 1; else counts.imported += 1;
  }
  return { records, skipped, researchAt, counts };
}
