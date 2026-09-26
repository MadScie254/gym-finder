import { isIP } from "node:net";

export const MAX_QUERY_LENGTH = 120;

type RateLimit = {
  hits: number;
  resetAt: number;
};

const rateLimits = new Map<string, RateLimit>();
const MAX_TRACKED_CLIENTS = 1_000;

function clientKey(request: Request): string {
  // Hosting providers append this header. A production deployment should replace
  // this process-local guard with its platform's durable rate limiter.
  const real = request.headers.get("x-real-ip")?.trim();
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = real || forwarded || "";
  return isIP(candidate) ? candidate : "anonymous";
}

function pruneExpired(now: number): void {
  if (rateLimits.size < MAX_TRACKED_CLIENTS) return;
  for (const [key, limit] of rateLimits) {
    if (limit.resetAt <= now) rateLimits.delete(key);
  }
  // Clearing the entire map would reset every active client's quota at once.
  while (rateLimits.size >= MAX_TRACKED_CLIENTS) {
    const oldest = rateLimits.keys().next().value;
    if (!oldest) break;
    rateLimits.delete(oldest);
  }
}

export function rateLimit(
  request: Request,
  scope: string,
  maxRequests: number,
  windowMs: number,
): Response | null {
  const now = Date.now();
  pruneExpired(now);
  const key = `${scope}:${clientKey(request)}`;
  const current = rateLimits.get(key);

  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { hits: 1, resetAt: now + windowMs });
    return null;
  }

  current.hits += 1;
  if (current.hits <= maxRequests) return null;

  const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  return Response.json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
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

export function readRadius(value: string | null, fallback = 0): number | null {
  if (value == null) return fallback;
  const radius = Number(value);
  // 0 = entire Kenya (catalog-wide nationwide search).
  if (radius === 0) return 0;
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
