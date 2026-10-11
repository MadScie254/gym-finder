const STOP = new Set(["gym", "fitness", "centre", "center", "club", "ltd", "limited", "the", "and", "&", "health", "studio"]);

export function normalizeName(value) {
  return `${value ?? ""}`.trim().replace(/_/g, " ").replace(/\s+/g, " ");
}

export function displayName(value) {
  const name = normalizeName(value);
  if (!name) return "Fitness centre";
  if (name === name.toUpperCase() && name.length > 3) {
    return name.toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase());
  }
  return name;
}

export function nameTokens(value) {
  return new Set(
    normalizeName(value)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token && !STOP.has(token)),
  );
}

export function tokenJaccard(a, b) {
  const left = nameTokens(a);
  const right = nameTokens(b);
  if (left.size === 0 || right.size === 0) return 0;
  let inter = 0;
  for (const token of left) if (right.has(token)) inter += 1;
  return inter / new Set([...left, ...right]).size;
}

export function sameWebsiteHost(a, b) {
  const host = (value) => {
    try {
      const url = new URL(value);
      const h = url.hostname.replace(/^www\./, "");
      if (/(^|\.)(facebook|instagram|twitter|x|tiktok|youtube)\.com$/.test(h)) return null;
      return h;
    } catch {
      return null;
    }
  };
  const ha = host(a);
  const hb = host(b);
  return Boolean(ha && hb && ha === hb);
}

export function haversineM(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sine = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(sine)));
}

export function shouldMerge(left, right, forcedPairs = []) {
  const pairKey = [left.id, right.id].sort().join("|");
  if (forcedPairs.includes(pairKey)) return { merge: true, reason: "override" };
  const phones = new Set(left.phones ?? []);
  if ((right.phones ?? []).some((phone) => phones.has(phone))) return { merge: true, reason: "phone" };
  if (left.website && right.website && sameWebsiteHost(left.website, right.website)) {
    return { merge: true, reason: "website" };
  }
  const metres = haversineM(
    { lat: left.lat, lng: left.lng },
    { lat: right.lat, lng: right.lng },
  );
  if (metres <= 150 && tokenJaccard(left.name, right.name) >= 0.5) {
    return { merge: true, reason: "name+distance" };
  }
  return { merge: false, metres, similarity: tokenJaccard(left.name, right.name) };
}

export function isProximityOnlyCandidate(left, right) {
  const metres = haversineM(
    { lat: left.lat, lng: left.lng },
    { lat: right.lat, lng: right.lng },
  );
  if (metres > 60) return false;
  const phones = new Set(left.phones ?? []);
  if ((right.phones ?? []).some((phone) => phones.has(phone))) return false;
  if (left.website && right.website && sameWebsiteHost(left.website, right.website)) return false;
  if (tokenJaccard(left.name, right.name) >= 0.5) return false;
  return true;
}

const DENY = /supplement|equipment|kinyozi|barber|salon|pharmacy|primary school|nursery/i;

export function denyListed(name) {
  return DENY.test(name);
}

export function slugify(name, id) {
  const base = normalizeName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "gym";
  const hash = [...`${id}`].reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 0);
  const suffix = Math.abs(hash).toString(16).slice(0, 4);
  return `${base}-${suffix}`;
}
