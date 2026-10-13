/**
 * Collapse a cluster of duplicate records into one venue record (brief 5.4).
 *
 *  - Location, name and the stable id come from OSM when it is in the cluster (a mapper
 *    surveyed it), else from the highest-confidence Overture record, else web research.
 *  - Contacts and hours are unioned; every field's source is recorded in `provenance`.
 *  - The other records' ids go to `aliases` (first source wins).
 *  - Web research fills gaps and adds evidence URLs; it counts as an additional
 *    independent source (`sources` gains "web") only when it cites the venue's own page.
 */
import { whatsappChoice } from "./phones.mjs";

const RANK = { osm: 0, overture: 1, web: 2 };
const familyOf = (record) => (record.web ? "web" : record.sources.includes("osm") ? "osm" : "overture");

function byPriority(a, b) {
  return RANK[familyOf(a)] - RANK[familyOf(b)]
    || (b.overtureConfidence ?? 0) - (a.overtureConfidence ?? 0)
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

const unique = (values) => [...new Set(values)];
const maxDate = (values) => values.filter(Boolean).sort().at(-1) ?? null;

/** Object with keys in sorted order, for byte-stable JSON. */
export function sortedObject(object) {
  return Object.fromEntries(Object.entries(object).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/** @param {object[]} members records of one cluster (any order) */
export function mergeCluster(members) {
  const sorted = [...members].sort(byPriority);
  const primary = sorted[0];
  const first = (get) => sorted.find((member) => get(member));
  const labelOf = (member, field) => member.provenance?.[field];

  const webMembers = sorted.filter((member) => member.web);
  const sourced = sorted.filter((member) => !member.web);
  const officialWeb = webMembers.some((member) => member.web.official);
  const sources = sourced.length
    ? unique([...sourced.flatMap((member) => member.sources), ...(officialWeb ? ["web"] : [])])
    : ["web"];

  // Phones: web-found numbers join only from an official page, or when nothing else has one.
  const havePhoneElsewhere = sourced.some((member) => member.phones.length);
  const phones = [];
  const phoneTypes = {};
  const phoneLabels = [];
  for (const member of sorted) {
    if (member.web && !member.web.official && havePhoneElsewhere) continue;
    const added = member.phones.filter((phone) => !phones.includes(phone));
    if (!added.length) continue;
    phones.push(...added);
    for (const phone of added) phoneTypes[phone] = member.phoneTypes?.[phone] ?? "other";
    phoneLabels.push(labelOf(member, "phone"));
  }

  const explicitWa = first((member) => member.whatsappSource === "osm")?.whatsapp ?? null;
  const whatsapp = whatsappChoice(phones, explicitWa);

  const address = first((member) => member.address);
  const website = first((member) => member.website);
  const instagram = first((member) => member.instagram);
  const facebook = first((member) => member.facebook);
  const hours = first((member) => member.hours);
  const hinted = first((member) => member.countyBy === "hint");
  const free = first((member) => member.fee === "free");

  const evidence = unique(webMembers.flatMap((member) => member.web.evidence ?? [])).slice(0, 3);
  const researchAt = maxDate(webMembers.map((member) => member.web.researchAt));
  const provenance = {
    name: labelOf(primary, "name"),
    location: labelOf(primary, "location"),
    ...(address ? { address: labelOf(address, "address") } : {}),
    ...(phones.length ? { phone: unique(phoneLabels).join("+") } : {}),
    ...(whatsapp ? { whatsapp: whatsapp.source === "osm" ? "osm" : "derived:mobile-phone" } : {}),
    ...(website ? { website: labelOf(website, "website") } : {}),
    ...(instagram ? { instagram: labelOf(instagram, "instagram") } : {}),
    ...(facebook ? { facebook: labelOf(facebook, "facebook") } : {}),
    ...(hours ? { hours: labelOf(hours, "hours") ?? hours.hours.source } : {}),
    ...(free ? { fee: labelOf(free, "fee") } : {}),
    ...(sorted.some((member) => Object.keys(member.amenities ?? {}).length) ? { amenities: unique(sorted.filter((m) => Object.keys(m.amenities ?? {}).length).map((m) => labelOf(m, "amenities") ?? "web")).join("+") } : {}),
    ...(evidence.length ? { evidence: evidence.join(" "), researched: researchAt } : {}),
  };
  for (const key of Object.keys(provenance)) if (!provenance[key]) delete provenance[key];

  return {
    id: primary.id,
    name: primary.name,
    nameRaw: primary.nameRaw,
    kind: first((member) => member.kind !== "gym")?.kind ?? "gym",
    lat: primary.lat,
    lng: primary.lng,
    approxRadiusM: sourced.length ? 0 : Math.max(...members.map((member) => member.approxRadiusM ?? 0)),
    address: address?.address ?? null,
    area: primary.area ?? first((member) => member.area)?.area ?? null,
    town: primary.town ?? first((member) => member.town)?.town ?? null,
    county: (hinted ?? primary).county,
    phones,
    phoneTypes,
    droppedPhones: sorted.flatMap((member) => member.droppedPhones ?? []),
    whatsapp: whatsapp?.number ?? null,
    website: website?.website ?? null,
    instagram: instagram?.instagram ?? null,
    facebook: facebook?.facebook ?? null,
    hours: hours?.hours ?? null,
    fee: free ? "free" : null,
    amenities: Object.assign({}, ...sorted.slice().reverse().map((member) => member.amenities ?? {})),
    sources,
    overtureConfidence: sourced.some((m) => m.overtureConfidence != null)
      ? Math.max(...sourced.map((member) => member.overtureConfidence ?? 0))
      : null,
    overtureDatasets: unique(sorted.flatMap((member) => member.overtureDatasets ?? [])).sort(),
    overtureUpdatedAt: maxDate(sorted.map((member) => member.overtureUpdatedAt)),
    osmUpdatedAt: maxDate(sorted.map((member) => member.osmUpdatedAt)),
    lastSeen: maxDate([...sourced.map((member) => member.lastSeen), ...(officialWeb || !sourced.length ? [researchAt] : [])]),
    provenance,
    osmUrl: first((member) => member.osmUrl)?.osmUrl ?? null,
    aliases: unique(sorted.slice(1).flatMap((member) => [member.id, ...(member.aliases ?? [])])).filter((id) => id !== primary.id).sort(),
    softDeny: sorted.every((member) => member.softDeny) ? primary.softDeny : null,
    web: webMembers.length ? { researchAt, official: officialWeb, evidence } : null,
    seedId: null,
  };
}
