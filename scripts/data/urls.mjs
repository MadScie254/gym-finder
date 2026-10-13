/**
 * URL normalisation and website/social separation.
 *
 * A "website" is the venue's own domain. Social profiles are never labelled
 * Website: Facebook and Instagram go to their own fields, every other social,
 * short-link, maps or link-in-bio host is dropped (Venue has no field for it).
 */

const FACEBOOK_HOSTS = /^(?:[a-z]{2}-[a-z]{2}\.|m\.|web\.|mbasic\.)?(?:facebook\.com|fb\.com|fb\.me)$/;
const INSTAGRAM_HOSTS = /^(?:instagram\.com|instagr\.am)$/;
/** Social, messaging, short-link, maps and link-in-bio hosts: never an "own domain" website. */
const NOT_A_SITE = /(?:^|\.)(?:twitter\.com|x\.com|tiktok\.com|youtube\.com|youtu\.be|linkedin\.com|pinterest\.[a-z.]+|snapchat\.com|threads\.net|t\.me|telegram\.me|wa\.me|whatsapp\.com|linktr\.ee|linktree\.com|beacons\.ai|g\.co|goo\.gl|maps\.app\.goo\.gl|bit\.ly|tinyurl\.com|booksy\.com|fresha\.com)$/;
/** Google Maps / Business Profile links (sites.google.com pages are real sites and stay allowed). */
const GOOGLE_PROFILE = /^(?:(?:www|maps|business|search|goo)\.)?google\.com$|^g\.page$/;
/** Facebook paths that are plugin/share endpoints, not a page. */
const FACEBOOK_NON_PAGE = /^\/(?:sharer|share|plugins|dialog|tr|login|l\.php|policies|help)(?:\/|\.php|$)/i;

function trackingParam(key) {
  return /^utm_/i.test(key) || /^(?:fbclid|gclid|gbraid|wbraid|msclkid|igshid|igsh|mc_cid|mc_eid|yclid|dclid|srsltid|_ga|ref|ref_src)$/i.test(key);
}

/** Canonical URL object, or null when it is not an http(s) URL. */
export function canonicalUrl(raw) {
  const text = String(raw ?? "").trim();
  if (!text || /^(?:mailto|tel|javascript|data|file):/i.test(text)) return null;
  let url;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text.replace(/^\/\//, "")}`);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".")) return null;
  url.hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  url.hash = "";
  url.username = "";
  url.password = "";
  for (const key of [...url.searchParams.keys()]) if (trackingParam(key)) url.searchParams.delete(key);
  return url;
}

/** Lower-case host without a leading "www.", or null. */
export function hostOf(raw) {
  const url = raw instanceof URL ? raw : canonicalUrl(raw);
  return url ? url.hostname.replace(/^www\./, "") : null;
}

/** True when the host is a social/short-link host, i.e. unusable as "same website" evidence. */
export function isSocialOrAggregatorHost(host) {
  return Boolean(host) && (FACEBOOK_HOSTS.test(host) || INSTAGRAM_HOSTS.test(host) || NOT_A_SITE.test(host) || GOOGLE_PROFILE.test(host));
}

function handleToUrl(hint, value) {
  const handle = String(value ?? "").trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9._-]{2,60}$/.test(handle)) return null;
  return hint === "instagram" ? `https://www.instagram.com/${handle}/` : `https://www.facebook.com/${handle}`;
}

/**
 * Split a mixed list of URLs into the venue's own website and its Facebook/Instagram pages.
 * @param {Array<string | { url: string, hint?: "facebook" | "instagram" }>} values
 * @returns {{ website: string | null, facebook: string | null, instagram: string | null, dropped: string[] }}
 */
export function classifyUrls(values) {
  const sites = [];
  let facebook = null;
  let instagram = null;
  const dropped = [];
  for (const item of values ?? []) {
    const entry = typeof item === "string" ? { url: item } : item;
    let raw = String(entry?.url ?? "").trim();
    if (!raw) continue;
    if (entry.hint && !/[./]/.test(raw)) raw = handleToUrl(entry.hint, raw) ?? raw;
    const url = canonicalUrl(raw);
    if (!url) {
      dropped.push(raw);
      continue;
    }
    const host = url.hostname.replace(/^www\./, "");
    if (INSTAGRAM_HOSTS.test(host)) {
      const handle = url.pathname.split("/").filter(Boolean)[0];
      if (handle && !/^(?:p|reel|reels|explore|accounts|stories|tv)$/i.test(handle)) {
        instagram ??= `https://www.instagram.com/${handle}/`;
      } else dropped.push(raw);
    } else if (FACEBOOK_HOSTS.test(host)) {
      if (url.pathname.length > 1 && !FACEBOOK_NON_PAGE.test(url.pathname)) {
        url.hostname = "www.facebook.com";
        url.protocol = "https:";
        facebook ??= url.toString().replace(/\/$/, "");
      } else dropped.push(raw);
    } else if (NOT_A_SITE.test(host) || GOOGLE_PROFILE.test(host)) {
      dropped.push(raw);
    } else {
      sites.push(url);
    }
  }
  // Prefer https: among URLs for the same host take the https one; an http-only
  // source URL is kept as given (we cannot know the site serves TLS).
  const first = sites[0] ?? null;
  const chosen = first && first.protocol === "http:"
    ? sites.find((url) => url.protocol === "https:" && hostOf(url) === hostOf(first)) ?? first
    : first;
  return { website: chosen ? chosen.toString() : null, facebook, instagram, dropped };
}

export function sameWebsiteHost(a, b) {
  const ha = hostOf(a);
  const hb = hostOf(b);
  if (!ha || !hb || isSocialOrAggregatorHost(ha) || isSocialOrAggregatorHost(hb)) return false;
  return ha === hb;
}
