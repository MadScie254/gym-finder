/**
 * Name deny-list (brief 5.4) and a softer "does not look like a gym" check.
 *
 * Hard deny: names matching DENY_PATTERN are removed from the catalogue, but the
 * build LOGS every removal to data/source/denylist-hits.json (id, name, match) so a
 * human can review it. "Academy" and "Club" are not on the list: they can be real.
 * A reviewed false positive goes in data/overrides/allow.json and bypasses the pass.
 *
 * Soft deny: a name with no fitness vocabulary that names a hotel, hall, stadium and
 * so on stays in the data but is capped at tier "unconfirmed" (hidden from default
 * browse, still found by exact name). Also logged.
 */

export const DENY_PATTERN = /\b(?:supplement|equipment|kinyozi|barber|salon|pharmacy|primary school|nursery)/i;

/** Words that make a name read as a fitness venue; a soft-deny never applies when one is present. */
const FITNESS_WORD = /gym|\bfit|crossfit|workout|yoga|pilates|karate|taekwondo|judo|jiu|boxing|\bbox\b|dojo|aerobic|athletic|bodybuilding|muscle|strength|zumba|dance|martial|\bmma\b|calisthenic|sports?\b|boot ?camp|spin/i;

/** Businesses that are plainly not a gym when nothing in the name says "gym". */
const NON_FITNESS_WORD = /\b(?:hotel|suites?|resort|forwarders?|showground|stadium|hall|broadcasting|interiors?|shopping|plaza|supermarket|church|mosque|school|college|hospital|restaurant|apartments?|bakery|cinema)\b/i;

/** The deny-list term a name matches (lower-cased), or null. */
export function denyMatch(name) {
  const hit = DENY_PATTERN.exec(`${name ?? ""}`);
  return hit ? hit[0].toLowerCase() : null;
}

export function denyListed(name) {
  return denyMatch(name) !== null;
}

/** Why a name does not read as a gym ("hotel"), or null. */
export function softDenyReason(name) {
  const text = `${name ?? ""}`;
  if (FITNESS_WORD.test(text)) return null;
  const hit = NON_FITNESS_WORD.exec(text);
  return hit ? `name suggests a ${hit[0].toLowerCase()}, not a gym` : null;
}
