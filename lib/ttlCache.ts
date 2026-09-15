type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const values = new Map<string, CacheEntry<unknown>>();
const pending = new Map<string, Promise<unknown>>();
const nextProviderRequest = new Map<string, number>();
const providerFailures = new Map<string, { failures: number; openUntil: number }>();
const MAX_ENTRIES = 300;

function clearExpired(now: number): void {
  for (const [key, entry] of values) {
    if (entry.expiresAt <= now) values.delete(key);
  }
  while (values.size >= MAX_ENTRIES) {
    const oldest = values.keys().next().value;
    if (!oldest) break;
    values.delete(oldest);
  }
}

/**
 * Coalesces duplicate requests and keeps small, short-lived provider responses
 * out of public map services. Use a durable cache when deploying to many instances.
 */
export async function withTtlCache<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const cached = values.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > now) return cached.value;

  const inFlight = pending.get(key) as Promise<T> | undefined;
  if (inFlight) return inFlight;

  const task = load()
    .then((value) => {
      clearExpired(Date.now());
      values.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}

/** Limits cache misses sent to a shared upstream service. */
export async function withProviderThrottle<T>(
  provider: string,
  minimumIntervalMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const nextAt = nextProviderRequest.get(provider) ?? 0;
  if (now < nextAt) {
    throw new Error("Map search is briefly busy. Please retry in a moment.");
  }
  nextProviderRequest.set(provider, now + minimumIntervalMs);
  return load();
}

/**
 * Stops repeatedly calling an unhealthy provider. This is deliberately
 * process-local; production deployments should back it with shared state.
 */
export async function withCircuitBreaker<T>(
  provider: string,
  load: () => Promise<T>,
  failureThreshold = 3,
  cooldownMs = 30_000,
): Promise<T> {
  const now = Date.now();
  const state = providerFailures.get(provider);
  if (state && state.openUntil > now) {
    throw new Error(`${provider} is temporarily unavailable`);
  }

  try {
    const value = await load();
    providerFailures.delete(provider);
    return value;
  } catch (error) {
    const failures = (state?.failures ?? 0) + 1;
    providerFailures.set(provider, {
      failures,
      openUntil: failures >= failureThreshold ? now + cooldownMs : 0,
    });
    throw error;
  }
}
