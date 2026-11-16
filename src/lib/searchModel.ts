import { searchVenues, type VenueIndex } from "../data/loadVenues";
import { foldPlace, venuesInPlace } from "./filterVenues";
import { plural, type Translate } from "./i18n";
import { COUNTIES } from "./kenya";
import { parseNearQuery, searchLandmarks, type Landmark, type LandmarkKind } from "./landmarks";
import { allAreas, areaPath, countyPath } from "./places";
import type { RecentSearch } from "./storage";

export type SuggestionKind = "recent" | "gyms" | "areas" | "landmarks" | "counties";
export type Suggestion = { id: string; label: string; hint?: string; href: string };
export type SuggestionGroup = { id: SuggestionKind; label: string; options: Suggestion[] };

const LANDMARK_HINT: Record<LandmarkKind, "hintMall" | "hintCollege" | "hintBusStation"> = {
  shopping_mall: "hintMall",
  college_university: "hintCollege",
  bus_station: "hintBusStation",
};

function gymCount(tr: Translate, n: number): string {
  return n === 0 ? tr("hintNoGyms") : plural(tr, n, "hintGymsOne", "hintGymsMany");
}

function matches(name: string, needle: string): boolean {
  const folded = foldPlace(name);
  return folded.startsWith(needle) || folded.includes(` ${needle}`);
}

export type SuggestionInput = {
  index: VenueIndex | null;
  landmarks: readonly Landmark[] | null;
  query: string;
  recent: readonly RecentSearch[];
  tr: Translate;
};

/**
 * Grouped suggestions in a fixed order: Gyms, Areas, Landmarks, Counties.
 * An empty field shows recent searches. "near X" skips gym names and looks for places.
 */
export function buildSuggestions({ index, landmarks, query, recent, tr }: SuggestionInput): SuggestionGroup[] {
  const text = query.trim();
  if (text.length < 2) {
    return [{ id: "recent", label: tr("groupRecent"), options: recent.map((row) => ({ id: row.href, label: row.label, href: row.href })) }];
  }
  const near = parseNearQuery(text);
  const needle = foldPlace(near ?? text);
  const visible = index?.venues.filter((venue) => venue.trust.tier !== "unconfirmed") ?? [];

  const gyms: Suggestion[] = !index || near ? [] : searchVenues(index, text, true).slice(0, 5).map((venue) => ({
    id: venue.id,
    label: venue.name,
    hint: venue.trust.tier === "unconfirmed" ? tr("hintUnconfirmed") : [venue.area, venue.town ?? venue.county].filter(Boolean).filter((v, i, all) => all.indexOf(v) === i).join(", ") || undefined,
    href: `/gym/${venue.slug}`,
  }));

  const areas: Suggestion[] = needle.length < 2 || !index ? [] : allAreas(index.venues)
    .filter((area) => matches(area.name, needle))
    .map((area) => ({ area, count: venuesInPlace(visible, area.name, area.point).length }))
    .sort((a, b) => Number(foldPlace(b.area.name) === needle) - Number(foldPlace(a.area.name) === needle) || b.count - a.count)
    .slice(0, 4)
    .map(({ area, count }) => ({
      id: area.slug,
      label: area.name,
      hint: `${tr(area.kind === "town" ? "hintTown" : "hintArea")}, ${gymCount(tr, count)}`,
      href: areaPath(area.name),
    }));

  const places: Suggestion[] = (landmarks ? searchLandmarks(landmarks, near ?? text, 4) : []).map((landmark) => ({
    id: landmark.id,
    label: landmark.name,
    hint: `${tr(LANDMARK_HINT[landmark.kind])}, ${tr("hintNear")}`,
    href: `/near/${landmark.slug}`,
  }));

  const counties: Suggestion[] = COUNTIES
    .filter((county) => matches(county.name, needle))
    .slice(0, 3)
    .map((county) => {
      const n = visible.filter((venue) => venue.county && foldPlace(venue.county) === foldPlace(county.name)).length;
      return { id: county.name, label: county.name, hint: `${tr("hintCounty")}, ${gymCount(tr, n)}`, href: countyPath(county.name) };
    });

  return [
    { id: "gyms", label: tr("groupGyms"), options: gyms },
    { id: "areas", label: tr("groupAreas"), options: areas },
    { id: "landmarks", label: tr("groupLandmarks"), options: places },
    { id: "counties", label: tr("groupCounties"), options: counties },
  ];
}
