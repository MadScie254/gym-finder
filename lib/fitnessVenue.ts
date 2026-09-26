/** Conservative inclusion rule: a sports field is not automatically a gym. */
export function isFitnessVenue(venue: { name: string; types: string[] }): boolean {
  const types = venue.types.map((value) => value.toLowerCase());
  if (/^(fitness centre|fitness center|gym|fitness station)$/i.test(venue.name.trim())) return false;
  if (types.some((value) => ["parking", "pitch", "stadium", "track", "shop"].includes(value))) return false;
  if (/parking lot|sports pitch|\btrack\b|\bhome\b/i.test(venue.name) &&
    !/\b(gym|fitness|crossfit)\b/i.test(venue.name)) return false;
  if (types.some((value) => ["fitness_centre", "fitness_station", "gym", "fitness"].includes(value))) {
    return true;
  }
  return /\b(gym|gymnasium|fitness|crossfit|bodybuilding|workout)\b/i.test(venue.name);
}
