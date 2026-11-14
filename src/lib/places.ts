import gazetteer from "@data/kenya-places.json";
import type { County, LatLng, Venue } from "../data/types";
import { foldPlace } from "./filterVenues";
import { COUNTIES } from "./kenya";
import { slugify } from "./slug";

export type AreaRef = { name: string; slug: string; point: LatLng | null; kind: "town" | "area" };

/** Every named area or town: from the gazetteer and from the gyms themselves, one entry per name. */
export function allAreas(venues: readonly Venue[]): AreaRef[] {
  const out = new Map<string, AreaRef>();
  for (const place of gazetteer.places) {
    const key = foldPlace(place.name);
    if (!out.has(key)) out.set(key, { name: place.name, slug: slugify(place.name), point: place.location, kind: place.kind === "town" ? "town" : "area" });
  }
  for (const venue of venues) {
    for (const [name, kind] of [[venue.town, "town"], [venue.area, "area"]] as const) {
      if (!name) continue;
      const key = foldPlace(name);
      if (!out.has(key)) out.set(key, { name, slug: slugify(name), point: null, kind });
    }
  }
  return [...out.values()].filter((area) => area.slug && !COUNTIES.some((county) => foldPlace(county.name) === foldPlace(area.name) && area.kind !== "town"));
}

/** Resolve the `:place` of `/in/:place`, which may be a slug ("dagoretti-corner") or a name ("Kisumu"). */
export function resolveArea(venues: readonly Venue[], param: string): AreaRef | null {
  const wanted = slugify(decodeURIComponent(param));
  if (!wanted) return null;
  return allAreas(venues).find((area) => area.slug === wanted) ?? null;
}

export function countySlug(county: County | string): string {
  return slugify(typeof county === "string" ? county : county.name);
}

export function resolveCounty(param: string): County | null {
  const wanted = slugify(decodeURIComponent(param));
  return COUNTIES.find((county) => countySlug(county) === wanted) ?? null;
}

export function areaPath(name: string): string {
  return `/in/${slugify(name)}`;
}

export function countyPath(name: string): string {
  return `/county/${slugify(name)}`;
}
