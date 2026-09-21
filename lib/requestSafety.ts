export const MAX_QUERY_LENGTH = 120;

type RateLimit = {
  hits: number;
  resetAt: number;
};

const rateLimits = new Map<string, RateLimit>();
const MAX_TRACKED_CLIENTS = 1_000;

/**
 * Single-value headers a reverse proxy overwrites with the visitor address.
 * Used only when X-Forwarded-For is absent. Set TRUSTED_CLIENT_IP_HEADER when
 * the edge's real client header must win (for example cf-connecting-ip behind
 * Cloudflare plus another proxy). Direct-to-origin callers can spoof headers;
 * production should sit behind a proxy that overwrites the chosen header.
 */
const PLATFORM_IP_HEADERS = [
  "cf-connecting-ip",
  "true-client-ip",
  "fly-client-ip",
  "x-vercel-forwarded-for",
  "x-real-ip",
] as const;

function normalizeIp(raw: string): string | null {
  let value = raw.trim().replace(/^"|"$/g, "");
  const zone = value.indexOf("%");
  if (zone !== -1) value = value.slice(0, zone);
  if (value.startsWith("[") && value.includes("]")) {
    value = value.slice(1, value.indexOf("]"));
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(value)) {
    value = value.slice(0, value.lastIndexOf(":"));
  }
  if (!value || value.length > 128) return null;

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) {
    const numbers = value.split(".").map((part) => Number(part));
    if (numbers.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
    return numbers.join(".");
  }

  if (value.includes(":") && /[0-9a-f]/i.test(value) && /^[0-9a-f:]+$/i.test(value)) {
    return value.toLowerCase();
  }
  return null;
}

function ipsFrom(header: string | null): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => normalizeIp(part))
    .filter((ip): ip is string => ip != null);
}

/**
 * Identity for the in-process limiter.
 * A configured TRUSTED_CLIENT_IP_HEADER is the only header consulted.
 * Otherwise the right-most X-Forwarded-For hop is used — the address appended
 * by the nearest proxy. The left-most value is client-supplied and ignored.
 * Platform headers apply only when that chain is missing.
 */
function clientIdentity(request: Request): string | null {
  const configured = process.env.TRUSTED_CLIENT_IP_HEADER?.trim().toLowerCase();
  if (configured) {
    const ips = ipsFrom(request.headers.get(configured));
    if (ips.length === 0) return null;
    return configured === "x-forwarded-for" ? ips[ips.length - 1] : ips[0];
  }

  const forwarded = ipsFrom(request.headers.get("x-forwarded-for"));
  if (forwarded.length > 0) return forwarded[forwarded.length - 1];

  for (const header of PLATFORM_IP_HEADERS) {
    const ips = ipsFrom(request.headers.get(header));
    if (ips.length > 0) return ips[0];
  }
  return null;
}

function tooMany(retryAfter: number): Response {
  return Response.json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

function ensureCapacity(now: number): void {
  for (const [key, limit] of rateLimits) {
    if (limit.resetAt <= now) rateLimits.delete(key);
  }
  // Evict the least-recently-used live bucket. Never clear() the map: wiping
  // every key resets active quotas and lets a full table unblock itself.
  while (rateLimits.size >= MAX_TRACKED_CLIENTS) {
    const oldest = rateLimits.keys().next().value;
    if (oldest === undefined) break;
    rateLimits.delete(oldest);
  }
}

function remember(key: string, entry: RateLimit): void {
  rateLimits.delete(key);
  rateLimits.set(key, entry);
}

/**
 * Process-local fixed window. Each serverless isolate keeps its own map, so
 * this is not a global quota — put a durable platform limiter in front when
 * more than one instance serves traffic. Unidentified production requests are
 * rejected instead of sharing one anonymous bucket.
 */
export function rateLimit(
  request: Request,
  scope: string,
  maxRequests: number,
  windowMs: number,
): Response | null {
  const now = Date.now();
  const identity = clientIdentity(request);
  if (!identity && process.env.NODE_ENV === "production") {
    return tooMany(60);
  }
  const key = `${scope}:${identity ?? "local-dev"}`;
  const current = rateLimits.get(key);

  if (!current || current.resetAt <= now) {
    ensureCapacity(now);
    remember(key, { hits: 1, resetAt: now + windowMs });
    return null;
  }

  current.hits += 1;
  remember(key, current);
  if (current.hits <= maxRequests) return null;

  const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  return tooMany(retryAfter);
}

/** Test isolation. Not used by request handlers. */
export function resetRateLimitsForTests(): void {
  rateLimits.clear();
}

export function readBoundedQuery(value: string | null):
  | { query: string }
  | { error: string } {
  const query = value?.trim() ?? "";
  if (!query) return { error: "q is required" };
  if (query.length > MAX_QUERY_LENGTH) {
    return { error: `q must be ${MAX_QUERY_LENGTH} characters or fewer` };
  }
  return { query };
}

export function readRadius(value: string | null, fallback = 5_000): number | null {
  if (value == null) return fallback;
  const radius = Number(value);
  if (!Number.isFinite(radius) || radius < 400 || radius > 40_000) return null;
  return Math.round(radius);
}

export const PLACE_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
};

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 8_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
