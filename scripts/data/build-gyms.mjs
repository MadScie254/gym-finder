import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COUNTIES, isInKenya, nearestCounty, reverseLookup } from "./geo.mjs";
import { denyListed, displayName, isProximityOnlyCandidate, shouldMerge, slugify } from "./merge-rules.mjs";
import { loadVenueOverrides } from "./overrides.mjs";
import { normalizePhones, whatsappFrom } from "./phones.mjs";
import { computeTrust } from "./trust.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = path.join(ROOT, "data", "source");
const PUBLIC_DATA = path.join(ROOT, "public", "data");
const OVERRIDES = path.join(ROOT, "data", "overrides");

const TAX_KIND = {
  gym: "gym",
  yoga_studio: "yoga",
  pilates_studio: "pilates",
  martial_arts_club: "martial_arts",
  boxing_class: "boxing",
  gymnastics_center: "gymnastics",
  boot_camp: "boot_camp",
  fitness_studio: "gym",
};

const EXTRA_TAX = new Set(["sport_or_fitness_facility", "swimming_pool", "dance_studio", "fitness_trainer"]);
const NAME_KEEP = /\b(gym|fitness|crossfit|workout|bodybuilding)\b/i;
const SOCIAL = /(?:^|\.)(facebook|instagram|twitter|x|tiktok|youtube)\.com$/i;

function readJsonMaybe(file, fallback) {
  if (!existsSync(file)) return fallback;
  return JSON.parse(readFileSync(file, "utf8"));
}

async function loadJsonRecords(file) {
  if (!existsSync(file)) return [];
  const raw = await readFile(file, "utf8");
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) return JSON.parse(trimmed);
  if (trimmed.startsWith("{") && !trimmed.includes("\n{")) {
    const parsed = JSON.parse(trimmed);
    return parsed.venues ?? parsed.gyms ?? parsed.records ?? [parsed];
  }
  return trimmed.split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

function kindOf(name, tax, basic) {
  if (/\bcrossfit\b/i.test(name)) return "crossfit";
  if (/martial|dojo|karate|taekwondo|judo/i.test(name)) return "martial_arts";
  if (/\bbox/i.test(name)) return "boxing";
  if (/\byoga\b/i.test(name)) return "yoga";
  if (/\bpilates\b/i.test(name)) return "pilates";
  if (TAX_KIND[tax]) return TAX_KIND[tax];
  if (TAX_KIND[basic]) return TAX_KIND[basic];
  return "gym";
}

function keepOverture(row) {
  const tax = row.tax ?? "";
  const basic = row.basic ?? "";
  if (TAX_KIND[tax] || TAX_KIND[basic]) return true;
  if (EXTRA_TAX.has(tax) || EXTRA_TAX.has(basic)) return NAME_KEEP.test(row.name ?? "");
  return NAME_KEEP.test(row.name ?? "");
}

function cleanAddress(value) {
  const address = `${value ?? ""}`.trim();
  if (!address || /^kenya$/i.test(address)) return null;
  return address;
}

function websiteOf(urls) {
  let site = null;
  let instagram = null;
  let facebook = null;
  for (const raw of urls ?? []) {
    try {
      const url = new URL(String(raw).startsWith("http") ? raw : `https://${raw}`);
      if (!/^https?:$/.test(url.protocol)) continue;
      url.hash = "";
      ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid"].forEach((k) => url.searchParams.delete(k));
      const host = url.hostname.replace(/^www\./, "");
      if (/instagram\.com$/i.test(host)) instagram ??= url.toString();
      else if (/facebook\.com$/i.test(host)) facebook ??= url.toString();
      else if (!SOCIAL.test(host)) site ??= url.toString();
    } catch {
      /* skip */
    }
  }
  return { website: site, instagram, facebook };
}

function newest(dates) {
  const parsed = (dates ?? []).map((d) => Date.parse(d)).filter(Number.isFinite);
  if (!parsed.length) return null;
  return new Date(Math.max(...parsed)).toISOString();
}

function amenitiesFromOsm(tags = {}) {
  const amenities = {};
  if (tags.wheelchair === "yes") amenities.wheelchair = true;
  if (tags.shower === "yes") amenities.showers = true;
  if (tags.sauna === "yes") amenities.sauna = true;
  if (tags.swimming_pool === "yes") amenities.pool = true;
  if (tags.female === "yes" || tags["female:only"] === "yes") amenities.women_only = true;
  return amenities;
}

function normalizeOverture(row) {
  if (!keepOverture(row)) return null;
  const lat = Number(row.lat);
  const lng = Number(row.lng);
  if (!isInKenya({ lat, lng })) return null;
  if (row.country && row.country !== "KE") return null;
  const name = displayName(row.name);
  if (denyListed(name) && !NAME_KEEP.test(name)) return null;
  const { phones } = normalizePhones(row.phones ?? []);
  const { website, instagram, facebook } = websiteOf(row.websites ?? row.socials ?? []);
  const places = reverseLookup({ lat, lng });
  const county = nearestCounty({ lat, lng }).name;
  return {
    id: `gers:${row.id}`,
    name,
    nameRaw: row.name,
    kind: kindOf(name, row.tax, row.basic),
    lat,
    lng,
    address: cleanAddress(row.addr),
    area: places.area,
    town: places.town ?? row.locality ?? null,
    county,
    phones,
    whatsapp: whatsappFrom(phones, null),
    website,
    instagram,
    facebook,
    hours: null,
    fee: null,
    amenities: {},
    sources: ["overture"],
    overtureConfidence: Number(row.confidence ?? 0),
    lastSeen: newest(row.upd ?? []),
    provenance: {
      name: "overture",
      location: "overture",
      ...(phones.length ? { phone: "overture" } : {}),
      ...(website ? { website: "overture" } : {}),
    },
    osmUrl: null,
    aliases: [],
  };
}

function normalizeOsm(row, snapshotAt) {
  const lat = Number(row.lat);
  const lng = Number(row.lng);
  if (!isInKenya({ lat, lng })) return null;
  const tags = row.tags ?? {};
  const name = displayName(row.name);
  if (denyListed(name) && !NAME_KEEP.test(name)) return null;
  const { phones } = normalizePhones([
    tags.phone, tags["contact:phone"], tags["contact:mobile"],
  ].filter(Boolean));
  const { website, instagram, facebook } = websiteOf([
    tags.website, tags["contact:website"], tags["contact:instagram"], tags["contact:facebook"],
  ].filter(Boolean));
  const places = reverseLookup({ lat, lng });
  const hoursRaw = tags.opening_hours || null;
  return {
    id: row.id,
    name,
    nameRaw: row.name,
    kind: kindOf(name, tags.leisure, tags.sport),
    lat,
    lng,
    address: cleanAddress([
      tags["addr:full"],
      [tags["addr:housenumber"], tags["addr:street"], tags["addr:suburb"], tags["addr:city"]]
        .filter(Boolean).join(", "),
    ].find(Boolean)),
    area: places.area ?? tags["addr:suburb"] ?? null,
    town: places.town ?? tags["addr:city"] ?? null,
    county: nearestCounty({ lat, lng }).name,
    phones,
    whatsapp: whatsappFrom(phones, tags["contact:whatsapp"]),
    website,
    instagram,
    facebook,
    hours: hoursRaw ? { raw: hoursRaw, source: "osm" } : null,
    fee: tags.fee === "no" || tags.fee === "free" || tags.charge === "no" ? "free" : null,
    amenities: amenitiesFromOsm(tags),
    sources: ["osm"],
    overtureConfidence: null,
    lastSeen: newest([tags.check_date, tags["survey:date"], snapshotAt]),
    provenance: {
      name: "osm",
      location: "osm",
      ...(phones.length ? { phone: "osm" } : {}),
      ...(hoursRaw ? { hours: "osm" } : {}),
    },
    osmUrl: `https://www.openstreetmap.org/${row.osmType}/${row.osmId}`,
    aliases: [],
  };
}

function mergePair(a, b) {
  const osmFirst = a.sources.includes("osm") ? a : b.sources.includes("osm") ? b : a;
  const other = osmFirst === a ? b : a;
  const phones = [...new Set([...a.phones, ...b.phones])];
  return {
    ...osmFirst,
    aliases: [...new Set([...(a.aliases ?? []), ...(b.aliases ?? []), other.id, other.name])],
    phones,
    whatsapp: osmFirst.whatsapp ?? other.whatsapp,
    website: osmFirst.website ?? other.website,
    instagram: osmFirst.instagram ?? other.instagram,
    facebook: osmFirst.facebook ?? other.facebook,
    hours: osmFirst.hours ?? other.hours,
    fee: osmFirst.fee ?? other.fee,
    amenities: { ...other.amenities, ...osmFirst.amenities },
    address: osmFirst.address ?? other.address,
    sources: [...new Set([...a.sources, ...b.sources])],
    overtureConfidence: Math.max(a.overtureConfidence ?? 0, b.overtureConfidence ?? 0) || null,
    lastSeen: [a.lastSeen, b.lastSeen].filter(Boolean).sort().at(-1) ?? null,
    provenance: { ...other.provenance, ...osmFirst.provenance },
    osmUrl: osmFirst.osmUrl ?? other.osmUrl,
  };
}

function applyOverride(venue, override) {
  if (!override) return venue;
  const set = override.set ?? {};
  // `hours` (OSM syntax) drives "open now"; otherwise the verbatim wording is shown as-is.
  const hoursRaw = set.hours ?? set.hoursText;
  const next = {
    ...venue,
    name: set.name ?? venue.name,
    address: set.address === undefined ? venue.address : set.address,
    website: set.website ?? venue.website,
    instagram: set.instagram ?? venue.instagram,
    phones: set.phone ? [...new Set([set.phone, ...venue.phones])] : venue.phones,
    whatsapp: set.whatsapp ?? venue.whatsapp,
    hours: hoursRaw
      ? { raw: hoursRaw, source: "override", ...(set.hoursText ? { text: set.hoursText } : {}) }
      : venue.hours,
    fee: set.fee === "free" ? "free" : venue.fee,
    amenities: { ...venue.amenities, ...(set.amenities ?? {}) },
  };
  if (set.prices && Object.keys(set.prices).length) {
    const sourced = (key) => override.evidence?.[`prices.${key}`]?.url ?? null;
    next.prices = Object.fromEntries(Object.entries(set.prices).map(([key, price]) => [
      key,
      { ...price, sourceUrl: sourced(key) },
    ]));
  }
  if (override.verification && override.verifiedAt) {
    next.verification = {
      method: override.verification,
      checkedAt: override.verifiedAt,
      evidence: override.evidence ?? {},
    };
  }
  const tag = override.verification ? `override:${override.verification}` : "override";
  const provenance = { ...next.provenance };
  for (const key of ["name", "address", "website", "instagram", "phone", "whatsapp", "fee"]) {
    if (set[key] !== undefined) provenance[key] = tag;
  }
  if (hoursRaw) provenance.hours = tag;
  for (const key of Object.keys(set.amenities ?? {})) provenance[`amenities.${key}`] = tag;
  for (const key of Object.keys(set.prices ?? {})) provenance[`prices.${key}`] = tag;
  next.provenance = provenance;
  return next;
}

async function loadOverrides() {
  const exclude = readJsonMaybe(path.join(OVERRIDES, "exclude.json"), []);
  const merge = readJsonMaybe(path.join(OVERRIDES, "merge.json"), []);
  const venues = await loadVenueOverrides(path.join(OVERRIDES, "venues"));
  return { exclude, merge, venues };
}

async function main() {
  const { exclude, merge: forced, venues: overrideById } = await loadOverrides();
  const excludeIds = new Set((exclude ?? []).map((row) => row.id));
  const forcedPairs = (forced ?? []).map((pair) => [pair.a, pair.b].sort().join("|"));

  const overtureRows = await loadJsonRecords(path.join(SOURCE, "overture-venues.json"));
  const osmPayload = existsSync(path.join(SOURCE, "osm-venues.json"))
    ? JSON.parse(await readFile(path.join(SOURCE, "osm-venues.json"), "utf8"))
    : { venues: [], osmStale: true };
  if (!Array.isArray(osmPayload.venues) || osmPayload.venues.length === 0) {
    throw new Error("OSM snapshot is empty; run data:extract before rebuilding the catalogue");
  }
  const landmarks = await loadJsonRecords(path.join(SOURCE, "overture-landmarks.json"));
  const meta = readJsonMaybe(path.join(SOURCE, "overture-meta.json"), { release: null });

  const normalized = [
    ...overtureRows.map(normalizeOverture),
    ...(osmPayload.venues ?? []).map((row) => normalizeOsm(row, osmPayload.generatedAt)),
  ].filter(Boolean).filter((row) => !excludeIds.has(row.id));

  const used = new Set();
  const merged = [];
  const review = [];
  for (let i = 0; i < normalized.length; i += 1) {
    if (used.has(i)) continue;
    let current = normalized[i];
    for (let j = i + 1; j < normalized.length; j += 1) {
      if (used.has(j)) continue;
      const decision = shouldMerge(current, normalized[j], forcedPairs);
      if (decision.merge) {
        current = mergePair(current, normalized[j]);
        used.add(j);
      } else if (isProximityOnlyCandidate(current, normalized[j])) {
        review.push({ a: current.id, b: normalized[j].id, aName: current.name, bName: normalized[j].name });
      }
    }
    merged.push(current);
  }

  const closed = new Set();
  const venues = merged.map((venue) => {
    const override = overrideById[venue.id] ?? Object.values(overrideById).find((item) => item.id === venue.id);
    if (override?.closed) {
      closed.add(venue.id);
      return null;
    }
    const next = applyOverride(venue, override);
    const trust = computeTrust(next, override);
    const slug = slugify(next.name, next.id);
    return {
      id: next.id,
      slug,
      aliases: next.aliases ?? [],
      name: next.name,
      kind: next.kind,
      lat: next.lat,
      lng: next.lng,
      area: next.area,
      town: next.town,
      county: next.county,
      address: next.address,
      phones: next.phones,
      whatsapp: next.whatsapp,
      website: next.website,
      instagram: next.instagram,
      facebook: next.facebook,
      hours: next.hours,
      fee: next.fee,
      amenities: next.amenities,
      ...(next.prices ? { prices: next.prices } : {}),
      trust,
      ...(next.verification ? { verification: next.verification } : {}),
      provenance: next.provenance,
      osmUrl: next.osmUrl,
    };
  }).filter(Boolean);

  await mkdir(PUBLIC_DATA, { recursive: true });
  await mkdir(SOURCE, { recursive: true });
  const body = JSON.stringify({ gyms: venues });
  const hash = createHash("sha256").update(body).digest("hex").slice(0, 10);
  const gymsName = `gyms.${hash}.json`;
  await writeFile(path.join(PUBLIC_DATA, gymsName), body);

  const byTier = { verified: 0, corroborated: 0, listed: 0, unconfirmed: 0 };
  const byCounty = Object.fromEntries(COUNTIES.map((c) => [c.name, 0]));
  const byKind = {};
  let withContact = 0;
  for (const venue of venues) {
    byTier[venue.trust.tier] += 1;
    byCounty[venue.county] = (byCounty[venue.county] ?? 0) + 1;
    byKind[venue.kind] = (byKind[venue.kind] ?? 0) + 1;
    if (venue.trust.tier !== "unconfirmed" && (venue.phones.length || venue.whatsapp || venue.website)) {
      withContact += 1;
    }
  }
  const defaultVisible = venues.filter((v) => v.trust.tier !== "unconfirmed").length;
  const manifest = {
    builtAt: new Date().toISOString(),
    overtureRelease: meta.release ?? null,
    osmSnapshotAt: osmPayload.generatedAt ?? null,
    osmStale: Boolean(osmPayload.osmStale),
    counts: { total: venues.length, defaultVisible, byTier, byCounty, byKind, withContact },
    licenses: [
      "ODbL-1.0 © OpenStreetMap contributors",
      "CDLA-Permissive-2.0 Overture Maps",
      "Apache-2.0 Foursquare (via Overture)",
      "CC BY 4.0 GeoNames",
    ],
    notices: [
      "Overture Places can contain duplicates and incomplete properties. Confidence measures existence, not that a gym is open.",
      "Address is omitted when unknown. We never invent hours, prices or ratings.",
    ],
    gymsPath: `/data/${gymsName}`,
  };
  await writeFile(path.join(PUBLIC_DATA, "manifest.json"), JSON.stringify(manifest, null, 2));

  const landmarkRows = landmarks.filter((row) => Number(row.confidence ?? 0) >= 0.6 && isInKenya({
    lat: Number(row.lat), lng: Number(row.lng),
  })).map((row) => ({
    id: row.id,
    name: displayName(row.name),
    kind: row.tax ?? row.basic ?? "landmark",
    lat: Number(row.lat),
    lng: Number(row.lng),
  }));
  await writeFile(path.join(PUBLIC_DATA, "landmarks.json"), JSON.stringify({ landmarks: landmarkRows }));
  await writeFile(path.join(SOURCE, "review-candidates.json"), JSON.stringify(review, null, 2));

  for (const file of await readdir(PUBLIC_DATA)) {
    if (file !== gymsName && /^gyms\.[a-f0-9]+\.json$/.test(file)) {
      await unlink(path.join(PUBLIC_DATA, file));
    }
  }

  console.log(`venues=${venues.length} visible=${defaultVisible} contact=${withContact} hash=${hash} review=${review.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
