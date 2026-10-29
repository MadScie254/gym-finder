# Coding Conventions

**Analysis Date:** 2026-10-29

## Naming Patterns

**Files:**
- React components: PascalCase `.tsx`, one default-exported component per file, file name equals component name: `components/GymCard.tsx`, `components/FilterSheet.tsx`, `components/GymFinderApp.tsx`.
- Library modules in `lib/`: camelCase `.ts` named after the domain concept: `lib/scoreGyms.ts`, `lib/requestSafety.ts`, `lib/kenyaGymCatalog.ts`, `lib/ttlCache.ts`, `lib/osmPlaces.ts`.
- Tests are co-located next to the module under test with a `.test.ts` suffix: `lib/format.test.ts` tests `lib/format.ts`. Cross-cutting tests are named by feature, not module: `lib/catalog.test.ts`, `lib/mapRoute.test.ts`.
- Next.js App Router special files are lowercase and fixed by the framework: `app/page.tsx`, `app/layout.tsx`, `app/manifest.ts`, `app/api/<area>/<action>/route.ts`.
- Node scripts are kebab-case `.mjs` in `scripts/`: `scripts/fetch-kenya-gyms.mjs`.
- Data files are kebab-case JSON in `data/`: `data/kenya-gyms.json`.

**Functions:**
- camelCase, verb-first: `formatDistance`, `safeExternalUrl`, `rankGyms`, `applyFilters`, `readBoundedQuery`, `searchNearbyGyms`.
- Prefixes carry meaning: `format*` (string output, `lib/format.ts`), `safe*` (validate and return `string | null`), `read*` (parse and validate request input), `fetch*` (client-side calls to `/api/*` in `lib/placesClient.ts`), `catalog*` (offline catalog reads in `lib/kenyaGymCatalog.ts`), `load*`/`save*` (localStorage in `lib/storage.ts`), `with*` (higher-order wrappers in `lib/ttlCache.ts`: `withTtlCache`, `withCircuitBreaker`, `withProviderThrottle`), `has*`/`is*` (booleans: `hasOnboarded`, `isInKenya`, `isFitnessVenue`).
- Uncached/cached split uses an `Uncached` suffix on the private implementation: `searchNearbyGymsUncached`, `getPlaceDetailsUncached` in `lib/osmPlaces.ts`.
- Test-only helpers are named with a `ForTests` suffix and documented: `resetRateLimitsForTests` in `lib/requestSafety.ts`.
- Event handler props use `on*` (`onSelect`, `onToggleSave`, `onChange`, `onSubmit`).

**Variables:**
- camelCase for locals and state; `useState` pairs are `[thing, setThing]` (`components/GymFinderApp.tsx`).
- Module-level constants are UPPER_SNAKE_CASE: `MAX_QUERY_LENGTH`, `OVERPASS_INTERVAL_MS`, `DETAILS_TTL_MS`, `KENYA_BOUNDS`, `DEFAULT_PROFILE`, `GOAL_KEYWORDS`.
- Unit suffixes are explicit: `*Ms`, `*Km`, `*Meters` (`timeoutMs`, `distanceKm`, `radiusMeters`).
- Numeric literals use `_` separators for thousands: `60_000`, `40_000`, `1_100`, `5_000`.
- Refs end in `Ref` (`mapRef`, `markersRef`, `onSelectRef`) in `components/MapView.tsx`.
- Unused-by-design values use `unknown`/narrowing, not `any` (see `loadSavedGyms` in `lib/storage.ts`).

**Types:**
- Use `type` aliases, not `interface`, everywhere (`lib/types.ts`, `lib/planner.ts`, component prop types).
- PascalCase names; component props are `<Component>Props` declared directly above the component (`GymCardProps`, `ProfileFormProps`).
- String-literal unions instead of enums: `Goal`, `Budget`, `GymLabel` in `lib/types.ts`; `SheetMode`, `SheetSize` in `components/GymFinderApp.tsx`.
- Shared domain types live in `lib/types.ts`; types tied to a single provider stay in that module (`OsmElement`, `NominatimHit`, `PlaceHit` in `lib/osmPlaces.ts`).
- Use `import type` / inline `type` modifiers for type-only imports (`import { DEFAULT_PROFILE, type ClientProfile } from "./types"`).
- Nullable values use `null` (not `undefined`) for "no data" on domain objects: `rating: number | null`, `phone: string | null`. Optional fields use `?` only for flags and API payload extras (`listingComplete?`, `warning?`).

## Code Style

**Formatting:**
- No Prettier or Biome config is present; formatting is by convention and editor defaults. Match the existing style:
  - 2-space indentation, double quotes, semicolons always, trailing commas in multi-line literals and argument lists.
  - Line width is loose (roughly 100-120 chars; long one-line ternaries and `expect` chains exist in `lib/*.test.ts`).
  - Arrow functions in callbacks, `function` declarations for exported and top-level helpers.
- Dense compact style is tolerated in a few places (single-line `try { ... } catch { ... }` in `lib/storage.ts`, tuple-packed object literals in `lib/planner.ts`); prefer the multi-line style used in `lib/scoreGyms.ts` for new code.

**Linting:**
- ESLint 9 flat config in `eslint.config.mjs`, extending `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`. Ignores `.next/**`, `out/**`, `build/**`, `next-env.d.ts`.
- No custom rules. Run with `npm run lint` (script is plain `eslint`).
- Suppressions are used sparingly, always with a line-scoped `// eslint-disable-next-line <rule>` directly above the line: `react-hooks/exhaustive-deps` (`components/GymFinderApp.tsx`, `components/MapView.tsx`), `@next/next/no-img-element` (`components/MapView.tsx`). Do not add file-wide disables.
- TypeScript is `strict: true` (`tsconfig.json`); no `@ts-ignore`/`@ts-expect-error` and no `any` in source. Casts are used at JSON/network boundaries only (`(await response.json()) as { error?: string }`).

## Import Organization

**Order (observed, not enforced by a rule):**
1. Framework / third-party: `next/*`, `react`, `maplibre-gl`, `vitest`, `node:*` built-ins.
2. Local siblings via relative path (`./FilterSheet`, `./kenya`) in components and within `lib/`.
3. Cross-directory imports via the `@/` alias (`@/lib/...`, `@/data/...`, `@/components/...`).
4. Type-only imports last in the block (`import type { Gym } from "@/lib/types"`).
- Components import `lib/` through `@/lib/*`; `lib/` modules import each other with `./`. Route handlers always use `@/lib/*` (`app/api/places/nearby/route.ts`).
- Exception: `lib/mapRoute.test.ts` imports a route handler by relative path (`../app/api/map/static/route`).

**Path Aliases:**
- `@/*` maps to the repo root (`tsconfig.json` `paths`), mirrored in `vitest.config.mts` via `resolve.alias`. Any new alias must be added to both files.
- JSON data is imported directly (`resolveJsonModule`): `import boundary from "@/data/kenya-boundary.json"`.

## Error Handling

**Patterns:**
- Route handlers (`app/api/**/route.ts`) follow a fixed order: (1) `rateLimit(request, "<scope>", max, windowMs)` and return early if it yields a `Response`; (2) validate input and return `NextResponse.json({ error }, { status: 400 })`; (3) call the lib inside `try/catch`; (4) return data with `PLACE_CACHE_HEADERS`.
  - Hard failures: `502` with `{ error: message }` (`app/api/places/details/route.ts`), 404 when a resource is missing.
  - Soft failures for list endpoints: HTTP 200 with `{ gyms: [], empty: true, warning: message }` and `Cache-Control: no-store` so the UI can show a notice and keep working (`app/api/places/nearby/route.ts`, `app/api/places/search/route.ts`).
  - Plain-text `new Response("msg", { status })` is used only by the binary static-map route (`app/api/map/static/route.ts`); JSON errors everywhere else.
- Error messages are extracted with `error instanceof Error ? error.message : "<fallback>"`.
- Validation helpers return discriminated results instead of throwing: `readBoundedQuery` returns `{ query } | { error }` and callers narrow with `"error" in result`; `readRadius` returns `number | null`; `safeExternalUrl`/`safeTelephoneUrl` return `string | null` (`lib/requestSafety.ts`, `lib/format.ts`).
- Best-effort upstream calls swallow errors with a bare `catch {}` plus a comment explaining why (`lib/osmPlaces.ts` live Overpass, `lib/kenyaGymCatalog.ts` `loadCatalog`, `public/sw.js`). Never leave an empty catch without a comment.
- Browser storage is wrapped in `try/catch` because storage may be unavailable; reads return a fallback (`readJson` in `lib/storage.ts`). Persisted data is validated/narrowed on load (`loadSavedGyms`, `loadProfile`) rather than trusted.
- Client fetch helpers (`lib/placesClient.ts`) throw `Error(payload.error || statusText)`; components catch and surface via a `notice` string state (`setNotice(error instanceof Error ? error.message : "Could not load gyms")` in `components/GymFinderApp.tsx`).
- Production-safety guards: external providers are disabled in production unless an env var configures an `https://` URL (`lib/osmPlaces.ts`, `lib/mapUpstream.ts`); fail with a clear `Error`/`503` rather than falling back to a public service.
- All upstream fetches go through `fetchWithTimeout` (`lib/requestSafety.ts`, default 8s) and are wrapped with `withTtlCache` / `withProviderThrottle` / `withCircuitBreaker` (`lib/ttlCache.ts`).
- Validate geography with `isInKenya` (polygon check, not just bounding box) before using any user-supplied coordinates.

## Logging

**Framework:** None in application code. `console.*` is not used under `app/`, `components/` or `lib/`.

**Patterns:**
- Only the Node scripts in `scripts/*.mjs` log, using `console.log` for progress, `console.warn` for recoverable failures, and `console.error` plus `process.exitCode = 1` for fatal errors.
- Server code reports problems to the client via response bodies (`error` / `warning`), not logs.

## Comments

**When to Comment:**
- Comment the *why*, especially for security, rate-limiting, licensing and data-quality decisions (`lib/requestSafety.ts` explains X-Forwarded-For hop choice and LRU eviction; `lib/scoreGyms.ts` explains why distance dominates the score; `lib/mapUpstream.ts` explains the production map requirement).
- Short line comments above non-obvious statements; no commented-out code.
- Empty `catch` blocks always carry a one-line reason.
- Inline `// Mombasa`-style trailing comments label test fixtures (`lib/catalog.test.ts`).

**JSDoc/TSDoc:**
- `/** ... */` blocks on exported helpers whose behaviour or constraints are not obvious (`seedTtlCache`, `withTtlCache`, `withCircuitBreaker`, `rateLimit`, `suggestKenyaPlaces`, `isFitnessVenue`). One to three sentences, no `@param`/`@returns` tags.
- Field-level `/** ... */` on type/const members for semantics (`listingComplete`, `radiusMeters: 0` meaning nationwide in `lib/types.ts`).
- Module-header doc comments on scripts and stub routes (`scripts/fetch-kenya-places.mjs`, `app/api/places/geocode/route.ts`).

## Function Design

**Size:** Library functions are small and single-purpose (typically under 40 lines). The exceptions are `lib/osmPlaces.ts` (413 lines, provider orchestration) and the `GymFinderApp` component (`components/GymFinderApp.tsx`, 524 lines, holds most UI state). Extract pure logic into `lib/` rather than growing components.

**Parameters:**
- Positional for 1-3 params; trailing optional params use defaults (`limit = 60`, `timeoutMs = 8_000`, `failureThreshold = 3`).
- Domain objects (`LatLng`, `Gym`, `ClientProfile`, `GymFilters`) are passed whole rather than as loose scalars.
- Component props are a single destructured object typed by `<Name>Props`; optional props have defaults in the destructure (`kicker = "Your brief"`).

**Return Values:**
- Pure functions return new objects/arrays and never mutate inputs (`scoreGym` returns `{ ...gym, ... }`; `rankGyms` copies before sorting with `[...list].sort`).
- "Not found / invalid" returns `null` (or `undefined` for `findCounty`) rather than throwing; throwing is reserved for infrastructure failures.
- Annotate return types on exported functions (`: string | null`, `: Gym[]`, `: Promise<Gym | null>`).

## Module Design

**Exports:**
- Components: `export default function Name()`. Everything in `lib/`: named exports only, no default exports.
- Route handlers export only the HTTP verb function (`export async function GET`).
- Side-effect-free modules; module-level mutable state exists only as intentional process-local caches (`lib/ttlCache.ts`, `lib/requestSafety.ts`, `cached` in `lib/kenyaGymCatalog.ts`).
- `"use client"` is the first line of every component that uses hooks, browser APIs or event handlers (all files in `components/`); `app/page.tsx` and `app/layout.tsx` are server components. Heavy browser-only components are loaded with `next/dynamic` and `ssr: false` (`MapView` in `components/GymFinderApp.tsx`).
- Next.js 16 typed route helpers are used (global `LayoutProps<"/">` in `app/layout.tsx`). Per `AGENTS.md`, consult `node_modules/next/dist/docs/` before writing Next.js code, because APIs differ from older versions.

**Barrel Files:** Not used. Import each module directly (`@/lib/format`, not `@/lib`).

## Styling

- Component styling is semantic, BEM-like class names defined in `app/globals.css` (`gym-card`, `gym-card__hit`, `gym-card__name`, `is-selected`, `save-btn`, `planner__controls`). State modifiers use `is-*` classes toggled via template strings: `` className={`gym-card ${selected ? "is-selected" : ""}`} ``.
- Tailwind v4 utility classes appear only on the root layout (`app/layout.tsx`: `h-full overflow-hidden antialiased`); everything else uses `globals.css` classes and CSS custom properties (`--font-display`, `--signal`, `--ink`, `--muted`, `--line`).
- Fonts are loaded through `next/font/google` and exposed as CSS variables (`app/layout.tsx`).
- Accessibility attributes are set on interactive elements: `aria-pressed`, `aria-label`, `aria-hidden`, `type="button"` on every non-submit button (`components/GymCard.tsx`).

## Copy and Data Honesty

- User-facing copy never invents data; absent prices/ratings/hours render as nothing or "OpenStreetMap" (`lib/format.ts`: `formatPrice` returns `null`, `starText` returns `"OpenStreetMap"`). Keep this when adding fields.
- Filters treat unknown data as non-matching (`applyFilters`, `budgetMatches` in `lib/scoreGyms.ts`).
- Use en-dash ranges and middle-dot separators in UI strings (`"8–10"`, `"A · B"`).

---

*Convention analysis: 2026-10-29*
