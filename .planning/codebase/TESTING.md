# Testing Patterns

**Analysis Date:** 2026-10-29

## Test Framework

**Runner:**
- Vitest `^4.1.11` (`package.json` devDependency)
- Config: `vitest.config.mts` (only sets the `@` alias to the repo root; default `node` environment, no setup files, no globals, no coverage block)

**Assertion Library:**
- Vitest built-in `expect` (Jest-compatible matchers). Imported explicitly: `import { describe, expect, it, vi, afterEach } from "vitest"`. Globals are NOT enabled.

**Run Commands:**
```bash
npm test                      # Run all tests once (vitest run)
npx vitest                    # Watch mode (no script defined; use npx)
npx vitest run lib/format.test.ts   # Single file
npm run check                 # lint + test + production build (what CI runs)
```
- Coverage: not configured. `/coverage` is gitignored in `.gitignore`, but no `@vitest/coverage-*` package is installed, so `vitest --coverage` requires adding one first.

## Test File Organization

**Location:**
- Co-located with source in `lib/` (flat, no `__tests__` directory). All 10 test files live in `lib/`.
- No tests exist for `components/`, `app/` pages, `scripts/` or `public/sw.js`. Route handlers are tested indirectly by importing them into a `lib/` test (`lib/mapRoute.test.ts`).

**Naming:**
- `<module>.test.ts` when testing one module: `lib/format.test.ts`, `lib/planner.test.ts`, `lib/scoreGyms.test.ts`, `lib/ttlCache.test.ts`, `lib/requestSafety.test.ts`, `lib/osmPlaces.test.ts`, `lib/kenyaPlaces.test.ts`, `lib/kenya.test.ts`.
- `<feature>.test.ts` for cross-module integrity checks: `lib/catalog.test.ts` (catalog + polygon + venue filter), `lib/mapRoute.test.ts` (map bounds + static-map route).
- Plain `.ts` (no JSX), so no jsdom/React Testing Library is needed.

**Structure:**
```
lib/
├── <module>.ts
└── <module>.test.ts      # sibling of the module it covers
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it } from "vitest";

import { safeExternalUrl, safeTelephoneUrl } from "./format";

describe("external contact helpers", () => {
  it("only permits http and https website URLs", () => {
    expect(safeExternalUrl("https://example.com/fitness")).toBe("https://example.com/fitness");
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("not a url")).toBeNull();
  });
});
```

**Patterns:**
- One top-level `describe` per behaviour area (named by capability, e.g. `"request boundary validation"`, `"provider resilience"`, `"gym filtering and ranking"`), with several `it` blocks. Some files use multiple `describe`s (`lib/mapRoute.test.ts`: `"map coverage"`, `"static map fallback"`).
- `it` titles are behavioural sentences, often stating a negative guarantee: `"does not treat short fragments as county names"`, `"rejects unidentified production traffic instead of sharing an anonymous bucket"`. Name new tests the same way (what must hold, not the function name).
- Several assertions per `it` are normal; each `it` covers one rule with a table of positive and negative inputs.
- Setup: inline within the test or small module-level helpers/fixtures (see Fixtures). No `beforeEach` is used.
- Teardown: `afterEach` restores stubs and shared state (see Mocking). Where a file has no `afterEach`, the test calls `vi.unstubAllGlobals()` inline at the end (`lib/osmPlaces.test.ts`).
- Isolation of module-level state is done by unique keys, not by resetting modules: `` const key = `coalesce-${Date.now()}` `` in `lib/ttlCache.test.ts`, `` `test-${Date.now()}` `` scope in `lib/requestSafety.test.ts`, and distinct `x-forwarded-for` IPs per `mapRequest` in `lib/mapRoute.test.ts`. Use unique cache keys / provider names / scopes for any new test touching `lib/ttlCache.ts` or `lib/requestSafety.ts`.
- Assertion style: `toBe` / `toEqual` for values, `toBeNull()` for "invalid" results, `toHaveLength`, `toContain`, `.every(...)` for invariants over collections, `.toBeTruthy()` for header presence, `expect(fn).toHaveBeenCalledTimes(n)` / `.not.toHaveBeenCalled()` for upstream-call guarantees.

## Mocking

**Framework:** Vitest `vi` (`vi.fn`, `vi.stubGlobal`, `vi.stubEnv`, `vi.unstubAllGlobals`, `vi.unstubAllEnvs`). No module mocking (`vi.mock`) and no network-mocking library (no MSW/nock) is used.

**Patterns:**
```typescript
// Stub global fetch, assert it is (not) called
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);
const details = await getPlaceDetails(listed.id);
expect(fetchMock).not.toHaveBeenCalled();
vi.unstubAllGlobals();

// Stub fetch with a canned Response
vi.stubGlobal(
  "fetch",
  vi.fn(async () => new Response("<html></html>", { headers: { "content-type": "text/html" } })),
);

// Environment toggles
vi.stubEnv("NODE_ENV", "production");
vi.stubEnv("ESRI_EXPORT_URL", "");

// Cleanup shared by the suite
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetRateLimitsForTests();   // from lib/requestSafety.ts
});
```
- Use `Response.json({ ... })` for JSON stubs (`lib/osmPlaces.test.ts`).
- Call route handlers directly with real Web/Next request objects instead of mocking the framework: `new NextRequest(url, { headers: { "x-forwarded-for": "198.51.100.40" } })` for `app/api/**/route.ts` handlers; plain `new Request(url, { headers })` for `lib/` helpers. Use RFC 5737/3849 documentation IPs (`198.51.100.x`, `203.0.113.x`, `192.0.2.x`).
- Time is real (`Date.now()`); no fake timers are used. Test circuit-breaker and throttle logic by call counts, not by advancing the clock.

**What to Mock:**
- Outbound network (`fetch`) to Overpass, Nominatim and Esri: always stub; tests must never hit the network.
- `process.env` values that switch production vs development behaviour (`NODE_ENV`, `ESRI_EXPORT_URL`) via `vi.stubEnv`.
- Failing providers: `vi.fn(async () => { throw new Error("upstream down"); })`.

**What NOT to Mock:**
- The checked-in data (`data/kenya-gyms.json`, `data/kenya-places.json`, `data/kenya-boundary.json`): tests read the real catalog and assert invariants over it (`lib/catalog.test.ts`, `lib/kenyaPlaces.test.ts`).
- Pure logic modules (`lib/kenya.ts`, `lib/scoreGyms.ts`, `lib/planner.ts`): call them for real.
- The rate limiter and TTL cache: exercise the real implementation with unique keys.

## Fixtures and Factories

**Test Data:**
```typescript
// lib/scoreGyms.test.ts: defaulted factory with overrides
function gym(overrides: Partial<Gym> = {}): Gym {
  return {
    id: "gym",
    name: "Gym",
    address: "Nairobi",
    location: { lat: -1.286, lng: 36.817 },
    rating: null,
    userRatingCount: 0,
    priceLevel: null,
    openNow: null,
    types: [],
    photoName: null,
    googleMapsUri: null,
    phone: null,
    website: null,
    weekdayHours: [],
    reviews: [],
    editorialSummary: null,
    distanceKm: null,
    score: 0,
    labels: [],
    ...overrides,
  };
}

const profile: ClientProfile = { goals: [], budget: "any", amenities: [] };
const filters: GymFilters = { openNow: false, minRating: 0, price: "any", radiusMeters: 5_000 };
```
- Factories are defined at the top of the test file (not shared). Build objects from the real types in `lib/types.ts`, and spread overrides last. Reuse `DEFAULT_PLAN_SETTINGS` (`lib/planner.ts`), `NAIROBI` (`lib/kenya.ts`) and `DEFAULT_*` constants rather than duplicating values.
- Real-world coordinates are used with a trailing comment naming the place: `{ lat: -4.0435, lng: 39.6682 }, // Mombasa`; out-of-country controls: Butiama (Tanzania), Kampala.

**Location:**
- No shared fixtures directory. Real data under `data/` acts as the integration fixture. Request helpers (e.g. `mapRequest`) are local functions inside the test file.

## Coverage

**Requirements:** None enforced. No threshold, no coverage provider, and CI (`.github/workflows/quality.yml`) does not collect coverage.

**View Coverage:**
```bash
npm i -D @vitest/coverage-v8   # not currently installed
npx vitest run --coverage
```

**CI:** `.github/workflows/quality.yml` runs on pull requests and pushes to `master` with Node 24: `npm ci`, `npm audit --omit=dev --audit-level=high`, then `npm run check` (eslint, `vitest run`, `next build`). A change must pass all three.

## Test Types

**Unit Tests:**
- The dominant type. Pure functions in `lib/` tested with literal inputs and table-style assertions: formatting and URL safety (`lib/format.test.ts`), ranking/filtering (`lib/scoreGyms.test.ts`), county/place matching (`lib/kenya.test.ts`, `lib/kenyaPlaces.test.ts`), plan generation (`lib/planner.test.ts`), request validation and rate limiting (`lib/requestSafety.test.ts`), caching/circuit-breaker (`lib/ttlCache.test.ts`).
- Focus is on edge cases and security/robustness regressions (spoofed headers, `javascript:` URLs, short county fragments, out-of-Kenya points, bucket-eviction behaviour).

**Integration Tests:**
- Lightweight, in-process: route handler invoked directly with a stubbed `fetch` (`lib/mapRoute.test.ts` for `app/api/map/static/route.ts`); catalog + polygon + venue-filter integrity over real data (`lib/catalog.test.ts`); `getPlaceDetails` against the catalog with a `fetch` spy (`lib/osmPlaces.test.ts`).
- Filesystem assertions are allowed for architectural guarantees (`expect(existsSync("app/api/map/tiles")).toBe(false)`), relative to the repo root as cwd.
- Other routes (`app/api/places/nearby`, `search`, `details`) have no direct tests.

**E2E Tests:**
- Not used. No Playwright/Cypress config. UI components (`components/*.tsx`), the service worker (`public/sw.js`), PWA manifest and the `scripts/*.mjs` data-refresh scripts are untested; verification is by `next build` and manual checks.

## Common Patterns

**Async Testing:**
```typescript
it("coalesces duplicate cache misses", async () => {
  const load = vi.fn(async () => "result");
  const key = `coalesce-${Date.now()}`;

  const results = await Promise.all([
    withTtlCache(key, 1_000, load),
    withTtlCache(key, 1_000, load),
    withTtlCache(key, 1_000, load),
  ]);

  expect(results).toEqual(["result", "result", "result"]);
  expect(load).toHaveBeenCalledTimes(1);
});
```

**Error Testing:**
```typescript
// Rejections
await expect(withCircuitBreaker(provider, load)).rejects.toThrow("upstream down");
await expect(withCircuitBreaker(provider, load)).rejects.toThrow("temporarily unavailable");

// Error-as-HTTP-status for route handlers and rate limits
const response = await getStaticMap(mapRequest("https://example.test/api/map/static?lat=-1.764&lng=33.965"));
expect(response.status).toBe(400);

const limited = rateLimit(request, scope, 1, 60_000);
expect(limited?.status).toBe(429);
expect(limited?.headers.get("Retry-After")).toBeTruthy();

// Validation results are discriminated unions compared whole
expect(readBoundedQuery("   ")).toEqual({ error: "q is required" });
```

## Writing a New Test: Checklist

1. Create `lib/<module>.test.ts` next to the module; import `describe`, `expect`, `it` (and `vi`, `afterEach` as needed) from `"vitest"`.
2. Import the module under test with `./` relative paths; use `@/data/...` for JSON data.
3. Name the `describe` after the capability and each `it` after the guarantee, preferring negative guarantees for validation code.
4. Stub `fetch`/env with `vi.stubGlobal`/`vi.stubEnv` and restore in `afterEach` (`vi.unstubAllGlobals()`, `vi.unstubAllEnvs()`, `resetRateLimitsForTests()`).
5. Use unique keys/scopes/IPs to avoid cross-test leakage through module-level Maps in `lib/ttlCache.ts` and `lib/requestSafety.ts`. Note `lib/osmPlaces.ts` also holds a process-local Overpass throttle, so tests that call it twice in one file depend on that shared state (see `lib/osmPlaces.test.ts`).
6. Run `npm test`, then `npm run check` before committing.

---

*Testing analysis: 2026-10-29*
