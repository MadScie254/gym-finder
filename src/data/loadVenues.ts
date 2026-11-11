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
 * Edits allowed per query term. A swapped pair of letters ("slaute" for "salute")
 * costs two edits, so terms of six or more letters get two; short terms stay strict
 * so "gym" does not match "gum" or "jim".
 */
export function fuzzyEdits(term: string): number {
  if (term.length <= 3) return 0;
  if (term.length <= 5) return 1;
  return 2;
}

export function createVenueSearch(venues: Venue[]): MiniSearch<Venue> {
  const search = new MiniSearch<Venue>({
    fields: ["name", "area", "town", "county", "kind"],
    storeFields: ["id", "slug", "name", "trust"],
    searchOptions: {
      boost: { name: 4, area: 2, town: 2, county: 1 },
      fuzzy: (term) => fuzzyEdits(term),
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
  const search = createVenueSearch(venues);
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
