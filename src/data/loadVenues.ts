import MiniSearch from "minisearch";
import type { DataManifest, Venue } from "./types";

export type VenueIndex = {
  manifest: DataManifest;
  venues: Venue[];
  byId: Map<string, Venue>;
  bySlug: Map<string, Venue>;
  search: MiniSearch<Venue>;
  builtMs: number;
};

function defaultVisible(venue: Venue): boolean {
  return venue.trust.tier !== "unconfirmed";
}

/**
 * Maximum edit distance per query term, by length: none for 1-2 letters (too many
 * neighbours), 1 for 3-5, 2 for 6+. A typed typo is usually one slip, but an adjacent
 * swap ("Slaute" for "Salute") costs 2 edits, so 6+ letter words need 2 to absorb it.
 * MiniSearch weights fuzzy hits below exact and prefix hits, so those still rank first.
 */
export function fuzzyDistance(term: string): number {
  const length = [...term].length;
  if (length <= 2) return 0;
  return length <= 5 ? 1 : 2;
}

/** The venue search index (also used by tests on fixtures). */
export function buildSearch(venues: Venue[]): MiniSearch<Venue> {
  const search = new MiniSearch<Venue>({
    fields: ["name", "area", "town", "county", "kind"],
    storeFields: ["id", "slug", "name", "trust"],
    searchOptions: {
      boost: { name: 4, area: 2, town: 2, county: 1 },
      fuzzy: (term) => fuzzyDistance(term),
      prefix: true,
    },
  });
  search.addAll(venues);
  return search;
}

export async function loadVenues(fetcher: typeof fetch = fetch): Promise<VenueIndex> {
  const manifest = await (await fetcher("/data/manifest.json")).json() as DataManifest;
  const payload = await (await fetcher(manifest.gymsPath)).json() as { gyms: Venue[] };
  const venues = payload.gyms ?? [];
  const started = performance.now();
  const search = buildSearch(venues);
  const builtMs = performance.now() - started;
  return {
    manifest,
    venues,
    byId: new Map(venues.map((venue) => [venue.id, venue])),
    bySlug: new Map(venues.map((venue) => [venue.slug, venue])),
    search,
    builtMs,
  };
}

export function searchVenues(index: VenueIndex, query: string, includeUnconfirmed = false) {
  const hits = index.search.search(query);
  return hits
    .map((hit) => index.byId.get(hit.id))
    .filter((venue): venue is Venue => Boolean(venue))
    .filter((venue) => includeUnconfirmed || defaultVisible(venue) || venue.name.toLowerCase() === query.trim().toLowerCase());
}

export { defaultVisible };
