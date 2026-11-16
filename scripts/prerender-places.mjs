// Static county and place pages for search engines (plan item G8).
// `slugify` and `foldPlace` are copies of src/lib/slug.ts and src/lib/filterVenues.ts, because
// the prerender script runs in plain Node. scripts/prerender.test.mjs keeps the copies in step.

export function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function foldPlace(value) {
  return String(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[-\s]+/g, " ")
    .trim();
}

const TIER_RANK = { verified: 0, corroborated: 1, listed: 2 };

function byTrustThenName(a, b) {
  const rank = (TIER_RANK[a.trust?.tier] ?? 3) - (TIER_RANK[b.trust?.tier] ?? 3);
  return rank || String(a.name).localeCompare(String(b.name), "en");
}

/**
 * The county and place pages worth prerendering: every county, town or area name that at least
 * one shown gym carries. Only shown gyms (not "unconfirmed") count, the same set the app lists by
 * default. A town or area named like its county is left to the county page. Gyms match a page the
 * way the app matches them: a county page by the county field, a place page by county, town or area.
 */
export function buildPlacePages(gyms) {
  const shown = gyms.filter((gym) => gym.trust?.tier !== "unconfirmed");
  const fields = (gym) => [gym.county, gym.town, gym.area].filter(Boolean).map(foldPlace);
  const pages = [];
  const taken = new Set();

  const add = (kind, name) => {
    const slug = slugify(name);
    const key = `${kind}:${slug}`;
    if (!slug || taken.has(key)) return;
    taken.add(key);
    const needle = foldPlace(name);
    // The app's county page matches the county field only; its place page matches county, town or area.
    const inPlace = (gym) => (kind === "county" ? [gym.county].filter(Boolean).map(foldPlace) : fields(gym)).includes(needle);
    const members = shown.filter(inPlace).sort(byTrustThenName);
    if (members.length === 0) return;
    pages.push({ kind, name, slug, path: `/${kind === "county" ? "county" : "in"}/${slug}/`, gyms: members });
  };

  const countyNames = new Set(shown.map((gym) => gym.county).filter(Boolean).map(foldPlace));
  for (const name of [...new Set(shown.map((gym) => gym.county).filter(Boolean))].sort()) add("county", name);
  for (const name of [...new Set(shown.flatMap((gym) => [gym.town, gym.area]).filter(Boolean))].sort()) {
    if (!countyNames.has(foldPlace(name))) add("place", name);
  }
  return pages;
}
