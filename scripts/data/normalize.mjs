/**
 * Turn raw OSM and Overture rows into internal venue records (brief 5.1 and 5.3).
 *
 * Both normalisers return one of
 *   { record }        a candidate venue
 *   { hit }           a row removed for a reviewable reason (logged to denylist-hits.json)
 *   { skip: reason }  a row that is simply out of scope (counted, not logged)
 * Records keep the source name as `nameRaw`; `name` is the cleaned display name.
 */
import { assignCounty, countyFromText, isInKenya, reverseLookup } from "./geo.mjs";
import { displayName } from "./merge-rules.mjs";
import { normalizePhones, whatsappChoice } from "./phones.mjs";
import { classifyUrls } from "./urls.mjs";

export const VENUE_KINDS = ["gym", "crossfit", "yoga", "pilates", "martial_arts", "boxing", "gymnastics", "boot_camp"];

/** Overture taxonomy.primary and basic_category values that mean "a place to train" (brief 5.1). */
export const KIND_BY_TAX = {
  gym: "gym",
  yoga_studio: "yoga",
  pilates_studio: "pilates",
  martial_arts_club: "martial_arts",
  boxing_class: "boxing",
  gymnastics_center: "gymnastics",
  boot_camp: "boot_camp",
  fitness_studio: "gym",
};
/** Fitness-adjacent categories: kept only when the NAME says gym/fitness/crossfit/workout/bodybuilding. */
const NAME_GATED_TAX = new Set([
  "sport_or_fitness_facility", "swimming_pool", "dance_studio", "fitness_trainer",
  // Meta files many real Kenyan gyms under the generic parent or with no category at all.
  "sports_and_recreation",
]);
const FITNESS_NAME = /\b(?:gym|fitness|crossfit|workout|bodybuilding)\b/i;

const NAME_KINDS = [
  ["crossfit", /cross-?fit/i],
  ["boot_camp", /boot ?camp/i],
  ["yoga", /\byoga\b/i],
  ["pilates", /\bpilates\b/i],
  ["martial_arts", /martial|\bdojo\b|karate|taekwondo|tae kwon|judo|jiu-?jitsu|kung ?fu|krav|\bmma\b|aikido|kick ?box|muay/i],
  ["boxing", /\bbox(?:ing|er)/i],
  ["gymnastics", /gymnastic|calisthenic/i],
];
const OSM_SPORT_KINDS = {
  crossfit: "crossfit", yoga: "yoga", pilates: "pilates", boxing: "boxing", gymnastics: "gymnastics",
  martial_arts: "martial_arts", karate: "martial_arts", judo: "martial_arts", taekwondo: "martial_arts",
  kickboxing: "martial_arts", jiu_jitsu: "martial_arts", brazilian_jiu_jitsu: "martial_arts",
};

/** Kind: a specific taxonomy wins; a generic gym/unknown category is refined by the name. */
export function kindOf(name, taxKind = null, sportKind = null) {
  if (/cross-?fit/i.test(name)) return "crossfit";
  if (taxKind && taxKind !== "gym") return taxKind;
  if (sportKind && sportKind !== "gym") return sportKind;
  for (const [kind, pattern] of NAME_KINDS) if (pattern.test(name)) return kind;
  return "gym";
}

const ADDRESS_FILLER = /^(?:kenya|ke|republic of kenya|n\/?a|none|null|unknown|not (?:listed|available)|-+|\.+)$/i;

/** Null when unknown. Never "Kenya", and never just a county name (that is not an address). */
export function cleanAddress(value) {
  const text = `${value ?? ""}`.replace(/\s+/g, " ").replace(/^[\s,;]+|[\s,;]+$/g, "");
  if (!text || ADDRESS_FILLER.test(text)) return null;
  const withoutCountry = text.replace(/[\s,]+kenya$/i, "");
  if (ADDRESS_FILLER.test(withoutCountry) || countyFromText(withoutCountry)) return null;
  return text;
}

/** YYYY-MM-DD from any date-ish value, or null. */
export function isoDate(value) {
  const at = Date.parse(value);
  return Number.isFinite(at) ? new Date(at).toISOString().slice(0, 10) : null;
}

const newest = (dates) => (dates ?? []).map(isoDate).filter(Boolean).sort().at(-1) ?? null;

/** Overture's own confidence-calculation source is stamped on every row; it is not a data update. */
const isDataSource = (source) => source && source.dataset !== "Overture" && !`${source.property ?? ""}`.includes("/confidence");

/** Datasets (lower-case) that actually supplied the record, and their newest update_time. */
export function overtureProvenance(row) {
  if (Array.isArray(row.sources) && row.sources.length) {
    const data = row.sources.filter(isDataSource);
    return {
      datasets: [...new Set(data.map((source) => `${source.dataset}`.toLowerCase()))].sort(),
      updatedAt: newest(data.map((source) => source.update_time)),
    };
  }
  return { datasets: [...new Set((row.srcs ?? []).map((d) => `${d}`.toLowerCase()).filter((d) => d !== "overture"))].sort(), updatedAt: null };
}

/** Reason an Overture row is out of scope as a fitness venue, or null when it qualifies. */
export function overtureCategoryRule(row, name) {
  if (KIND_BY_TAX[row.tax] || KIND_BY_TAX[row.basic]) return null;
  if ((!row.tax || NAME_GATED_TAX.has(row.tax)) && FITNESS_NAME.test(name)) return null;
  return `category:${row.tax ?? "none"}`;
}

function townFor(places, locality) {
  if (places.town) return places.town;
  return locality && !countyFromText(locality) ? locality : null;
}

export function normalizeOverture(row) {
  if (row.country !== "KE") return { skip: "country" };
  const lat = Number(row.lat);
  const lng = Number(row.lng);
  if (!isInKenya({ lat, lng })) return { skip: "polygon" };
  const id = `gers:${row.id}`;
  const name = displayName(row.name);
  if (!name) return { skip: "no-name" };
  const rule = overtureCategoryRule(row, name);
  if (rule) return { hit: { id, name, rule, tax: row.tax ?? null, confidence: round2(row.confidence) } };

  const { phones, dropped, types } = normalizePhones(row.phones ?? []);
  const urls = classifyUrls([...(row.websites ?? []), ...(row.socials ?? [])]);
  const places = reverseLookup({ lat, lng });
  const county = assignCounty({ lat, lng }, [row.region, row.locality]);
  const { datasets, updatedAt } = overtureProvenance(row);
  const label = datasets.length ? `overture:${datasets.join("+")}` : "overture";
  const whatsapp = whatsappChoice(phones, null);
  const cleaned = cleanAddress(row.addr);
  return {
    record: {
      id,
      name,
      nameRaw: row.name,
      kind: kindOf(name, KIND_BY_TAX[row.tax] ?? KIND_BY_TAX[row.basic]),
      lat,
      lng,
      address: cleaned,
      area: places.area,
      town: townFor(places, row.locality),
      county: county.name,
      countyBy: county.by,
      phones,
      phoneTypes: types,
      droppedPhones: dropped,
      whatsapp: whatsapp?.number ?? null,
      whatsappSource: whatsapp ? "derived:mobile-phone" : null,
      website: urls.website,
      instagram: urls.instagram,
      facebook: urls.facebook,
      hours: null,
      fee: null,
      amenities: {},
      sources: ["overture"],
      overtureConfidence: Number(row.confidence ?? 0),
      overtureDatasets: datasets,
      overtureUpdatedAt: updatedAt,
      osmUpdatedAt: null,
      lastSeen: updatedAt,
      provenance: {
        ...field(label, { name: true, location: true, address: cleaned, phone: phones.length, website: urls.website, instagram: urls.instagram, facebook: urls.facebook }),
        ...(whatsapp ? { whatsapp: "derived:mobile-phone" } : {}),
      },
      osmUrl: null,
      aliases: [],
      softDeny: null,
    },
  };
}

const round2 = (value) => (Number.isFinite(Number(value)) ? Math.round(Number(value) * 100) / 100 : null);

/** { field: label } for every field that has a value. */
function field(label, present) {
  const out = {};
  for (const [key, value] of Object.entries(present)) if (value) out[key] = label;
  return out;
}

function osmAmenities(tags) {
  const amenities = {};
  if (tags.wheelchair === "yes") amenities.wheelchair = true;
  if (tags.shower === "yes") amenities.showers = true;
  if (tags.sauna === "yes") amenities.sauna = true;
  if (tags.swimming_pool === "yes" || tags.leisure === "swimming_pool") amenities.pool = true;
  // Only an unambiguous women-only tag counts; female=yes alone just means women are served.
  if (tags.female === "only" || (tags.female === "yes" && tags.male === "no") || /^(?:female|women)(?:_only)?$/.test(tags.gender ?? "")) amenities.women_only = true;
  return amenities;
}

function osmKind(name, tags) {
  const sports = `${tags.sport ?? ""}`.split(";").map((s) => s.trim());
  const sportKind = sports.map((s) => OSM_SPORT_KINDS[s]).find(Boolean) ?? null;
  return kindOf(name, null, sportKind);
}

function osmAddress(tags) {
  if (tags["addr:full"]) return cleanAddress(tags["addr:full"]);
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  return cleanAddress([street, tags["addr:suburb"], tags["addr:city"]].filter(Boolean).join(", "));
}

export function normalizeOsm(row) {
  const lat = Number(row.lat);
  const lng = Number(row.lng);
  if (!isInKenya({ lat, lng })) return { skip: "polygon" };
  const tags = row.tags ?? {};
  const name = displayName(row.name ?? tags.name);
  if (!name) return { skip: "no-name" };

  const { phones, dropped, types } = normalizePhones([tags.phone, tags["contact:phone"], tags["contact:mobile"], tags.mobile]);
  const urls = classifyUrls([
    tags.website, tags["contact:website"], tags.url,
    tags["contact:instagram"] && { url: tags["contact:instagram"], hint: "instagram" },
    tags.instagram && { url: tags.instagram, hint: "instagram" },
    tags["contact:facebook"] && { url: tags["contact:facebook"], hint: "facebook" },
    tags.facebook && { url: tags.facebook, hint: "facebook" },
  ].filter(Boolean));
  const places = reverseLookup({ lat, lng });
  const county = assignCounty({ lat, lng }, [tags["addr:county"], tags["addr:state"], tags["is_in:county"]]);
  const whatsapp = whatsappChoice(phones, tags["contact:whatsapp"] ?? tags.whatsapp);
  const hours = tags.opening_hours ? `${tags.opening_hours}`.trim() : "";
  const updatedAt = newest([tags.check_date, tags["survey:date"], row.timestamp, row.meta?.timestamp]);
  const address = osmAddress(tags);
  const amenities = osmAmenities(tags);
  const free = tags.fee === "no" || tags.fee === "free" || tags.charge === "no";
  const whatsappLabel = whatsapp?.source === "osm" ? "osm" : "derived:mobile-phone";
  const osmPath = row.osmType && row.osmId ? `${row.osmType}/${row.osmId}` : `${row.id}`.replace(/^osm:/, "");
  return {
    record: {
      id: row.id,
      name,
      nameRaw: row.name ?? tags.name,
      kind: osmKind(name, tags),
      lat,
      lng,
      address,
      area: places.area ?? tags["addr:suburb"] ?? null,
      town: places.town ?? tags["addr:city"] ?? null,
      county: county.name,
      countyBy: county.by,
      phones,
      phoneTypes: types,
      droppedPhones: dropped,
      whatsapp: whatsapp?.number ?? null,
      whatsappSource: whatsapp ? whatsappLabel : null,
      website: urls.website,
      instagram: urls.instagram,
      facebook: urls.facebook,
      hours: hours ? { raw: hours, source: "osm" } : null,
      fee: free ? "free" : null,
      amenities,
      sources: ["osm"],
      overtureConfidence: null,
      overtureDatasets: [],
      overtureUpdatedAt: null,
      osmUpdatedAt: updatedAt,
      lastSeen: updatedAt,
      provenance: {
        ...field("osm", { name: true, location: true, address, phone: phones.length, website: urls.website, instagram: urls.instagram, facebook: urls.facebook, hours }),
        ...(whatsapp ? { whatsapp: whatsappLabel } : {}),
        ...(Object.keys(amenities).length ? { amenities: "osm" } : {}),
        ...(free ? { fee: "osm" } : {}),
      },
      osmUrl: `https://www.openstreetmap.org/${osmPath}`,
      aliases: [],
      softDeny: null,
    },
  };
}
