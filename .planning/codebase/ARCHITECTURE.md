<!-- refreshed: 2026-10-29 -->
# Architecture

**Analysis Date:** 2026-10-29

> Project rule (`AGENTS.md`): this is a Next.js 16 build with breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` (after `npm ci`) before writing Next-specific code. Note `app/layout.tsx` uses the globally-typed `LayoutProps<"/">` helper rather than a hand-written props type.

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                  Browser (PWA, single client page)                   │
├───────────────────┬───────────────────┬─────────────────────────────┤
│  Shell / state    │   Map             │   Sheet panels              │
│ `components/      │ `components/      │ `components/GymList.tsx`,   │
│  GymFinderApp.tsx`│  MapView.tsx`     │ `GymDetail.tsx`, `Planner`, │
│  (all app state)  │  (MapLibre, lazy) │ `FilterSheet`, `ProfileForm`│
└────────┬──────────┴─────────┬─────────┴──────────────┬──────────────┘
         │ fetch /api/places/*│ tiles (direct)         │ localStorage
         ▼                    ▼                        ▼
┌──────────────────────┐ ┌──────────────────┐ ┌───────────────────────┐
│ Client lib (pure)    │ │ OpenFreeMap tiles│ │ `lib/storage.ts`      │
│ `lib/placesClient.ts`│ │ tiles.openfreemap│ │ profile, favourites,  │
│ `lib/scoreGyms.ts`   │ │ .org (CSP-allowed)│ │ saved gym snapshots   │
│ `lib/planner.ts`     │ └──────────────────┘ └───────────────────────┘
└────────┬─────────────┘
         │ HTTP GET (JSON)
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│        Route Handlers (thin, validate + rate-limit + delegate)       │
│ `app/api/places/{nearby,search,details,geocode,photo}/route.ts`      │
│ `app/api/map/static/route.ts`                                        │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Server domain layer: `lib/osmPlaces.ts` (orchestrator)               │
│  catalog-first → optional live Overpass/Nominatim, merged            │
│  guards: `lib/requestSafety.ts`, `lib/ttlCache.ts`                   │
└────────┬───────────────────────────────┬────────────────────────────┘
         ▼                               ▼
┌──────────────────────────┐   ┌─────────────────────────────────────┐
│ Checked-in data          │   │ Optional upstreams (env-gated)       │
│ `data/kenya-gyms.json`   │   │ Overpass, Nominatim, Esri export     │
│ `data/kenya-places.json` │   │ (`OVERPASS_ENDPOINTS`, `NOMINATIM_URL`,│
│ `data/kenya-boundary.json`│  │  `ESRI_EXPORT_URL`)                  │
└──────────────────────────┘   └─────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Root layout | Fonts, metadata, viewport, PWA icons, mounts service worker registrar | `app/layout.tsx` |
| Home page | Server component that renders the single client app | `app/page.tsx` |
| Web manifest | Typed `manifest.webmanifest` generation | `app/manifest.ts` |
| GymFinderApp | Owns all UI state (origin, gyms, filters, profile, favourites, sheet mode), orchestrates fetches, composes map + sheet | `components/GymFinderApp.tsx` |
| MapView | MapLibre GL map (client-only, dynamically imported), markers, selection, idle-center callback | `components/MapView.tsx` |
| GymList / GymCard | Ranked list presentation | `components/GymList.tsx`, `components/GymCard.tsx` |
| GymDetail | Selected-gym panel (hours, contact, directions link) | `components/GymDetail.tsx` |
| FilterSheet | Radius / open-now / rating / price filter UI | `components/FilterSheet.tsx` |
| ProfileForm | Onboarding + goals/budget/amenity profile | `components/ProfileForm.tsx` |
| Planner | Four-week training + seven-day Kenyan meal guide UI | `components/Planner.tsx` |
| PlaceSearch | Search box with local gazetteer suggestions (no network per keystroke) | `components/PlaceSearch.tsx` |
| InstallPrompt / ServiceWorkerRegister | PWA install nudge and SW registration (skipped in dev) | `components/InstallPrompt.tsx`, `components/ServiceWorkerRegister.tsx` |
| Places orchestrator | Nearby / text search / details; merges catalog with optional live OSM data | `lib/osmPlaces.ts` |
| Gym catalog | Loads and queries `data/kenya-gyms.json` (haversine, name/address match) | `lib/kenyaGymCatalog.ts` |
| Gazetteer | Local town / neighbourhood / county suggestions from GeoNames extract | `lib/kenyaPlaces.ts` |
| Kenya geometry | Counties, point-in-polygon `isInKenya`, `haversineKm`, `NAIROBI` | `lib/kenya.ts` |
| Scoring | Distance-dominant ranking, filters, labels (`best_match`/`closest`/`top_rated`) | `lib/scoreGyms.ts` |
| Planner logic | Pure training/meal plan builders | `lib/planner.ts` |
| Request safety | Rate limiter, client-IP resolution, query/radius validation, `fetchWithTimeout`, cache headers | `lib/requestSafety.ts` |
| TTL cache / breakers | In-process cache, request coalescing, provider throttle, circuit breaker | `lib/ttlCache.ts` |
| Browser storage | Typed localStorage access for profile, favourites, saved snapshots, flags | `lib/storage.ts` |
| Fetch client | Typed wrappers around `/api/places/*` | `lib/placesClient.ts` |
| Service worker | App-shell precache, network-first navigation, runtime asset cache | `public/sw.js` |

## Pattern Overview

**Overall:** Single-page client application (one route, `/`) backed by thin Next.js Route Handlers over a local-first, checked-in dataset, with optional live upstream enrichment.

**Key Characteristics:**
- One server-rendered entry (`app/page.tsx`) that immediately hands off to a `"use client"` root (`components/GymFinderApp.tsx`); there is no multi-route navigation. "Screens" are sheet modes (`SheetMode` = `list | detail | filters | profile | plan | onboarding`) inside that component.
- No database and no accounts: the catalog, gazetteer and Kenya boundary are static JSON in `data/`; user state is device-local (`lib/storage.ts`).
- Local-first / keyless: production works with no credentials. Live Overpass/Nominatim/Esri are enabled only via env vars (and public instances only when `NODE_ENV !== "production"`); every live call is best-effort and falls back to the catalog.
- Defence-in-depth around upstream calls: rate limit -> input validation -> TTL cache/coalescing -> provider throttle -> circuit breaker -> timeout.
- Scoring and ranking run on the client (`rankGyms` in `components/GymFinderApp.tsx` via `useMemo`), not on the server; the API returns unscored gyms (`score: 0`, `distanceKm: null`).
- Business logic lives in plain functions in `lib/` with co-located Vitest specs; React components stay presentational apart from the root.

## Layers

**Presentation (client components):**
- Purpose: render the map and bottom/side sheet, collect user input.
- Location: `components/`
- Contains: React 19 client components (`"use client"`), Tailwind v4 utility classes plus hand-written classes in `app/globals.css`.
- Depends on: `lib/types.ts`, `lib/format.ts`, `lib/scoreGyms.ts`, `lib/storage.ts`, `lib/placesClient.ts`, `lib/kenya.ts`, `lib/kenyaPlaces.ts`, `maplibre-gl`.
- Used by: `app/page.tsx`.

**Client domain / utilities (isomorphic pure logic):**
- Purpose: ranking, formatting, plan generation, storage, geometry.
- Location: `lib/scoreGyms.ts`, `lib/planner.ts`, `lib/format.ts`, `lib/storage.ts`, `lib/kenya.ts`, `lib/kenyaPlaces.ts`, `lib/cover.ts`, `lib/mapBounds.ts`, `lib/placesClient.ts`, `lib/types.ts`
- Contains: pure functions and constants; `lib/kenya.ts` and `lib/kenyaPlaces.ts` import JSON from `data/` so the boundary and gazetteer are bundled into the client for offline autocomplete and point-in-Kenya checks.
- Depends on: `data/*.json`, `lib/types.ts`.
- Used by: components and route handlers.

**API (Route Handlers):**
- Purpose: validate input, enforce rate limits, delegate to the server domain layer, shape JSON and cache headers.
- Location: `app/api/places/*/route.ts`, `app/api/map/static/route.ts`
- Contains: `export async function GET(request: NextRequest)` only; no business logic beyond routing (the county/place/text decision tree in `app/api/places/search/route.ts` is the largest).
- Depends on: `lib/requestSafety.ts`, `lib/osmPlaces.ts`, `lib/kenya.ts`, `lib/kenyaPlaces.ts`, `lib/mapUpstream.ts`.
- Used by: browser `fetch` via `lib/placesClient.ts` and `components/MapView.tsx` (static fallback URL).

**Server domain / data access:**
- Purpose: produce `Gym[]` from catalog + optional live OSM providers.
- Location: `lib/osmPlaces.ts`, `lib/kenyaGymCatalog.ts`, `lib/mapUpstream.ts`, `lib/fitnessVenue.ts`
- Contains: Overpass query building, OSM element -> `Gym` mapping, catalog read (`node:fs` `readFileSync` of `data/kenya-gyms.json`, memoised in a module variable), merge/dedupe by id.
- Depends on: `lib/ttlCache.ts`, `lib/requestSafety.ts` (`fetchWithTimeout`), `lib/kenya.ts`, `data/`.
- Used by: Route Handlers.

**Infrastructure helpers (server, process-local):**
- Purpose: protect upstreams and the app itself.
- Location: `lib/requestSafety.ts`, `lib/ttlCache.ts`
- Depends on: `node:net`.

**Offline / PWA:**
- Purpose: installability and offline shell.
- Location: `public/sw.js`, `app/manifest.ts`, `components/ServiceWorkerRegister.tsx`, `components/InstallPrompt.tsx`.

**Data pipeline (offline, developer-run):**
- Purpose: regenerate checked-in datasets and icons.
- Location: `scripts/fetch-kenya-gyms.mjs` (Overpass -> `data/kenya-gyms.json`; `--curate-existing` re-filters offline), `scripts/fetch-kenya-places.mjs` (GeoNames KE.zip -> `data/kenya-places.json`), `scripts/make-icons.mjs` (-> `public/icons/`).

## Data Flow

### Primary Request Path (nearby / nationwide listing)

1. `GymFinderApp` mounts, loads profile/favourites/saved snapshots from `localStorage` (`lib/storage.ts`), then calls `loadNearby(NAIROBI, filters.radiusMeters, ...)` (`components/GymFinderApp.tsx`, effect gated on `ready`).
2. `fetchNearbyGyms` issues `GET /api/places/nearby?lat&lng&radius` (`lib/placesClient.ts`).
3. `app/api/places/nearby/route.ts` applies `rateLimit(request, "places-nearby", 30, 60_000)`, parses lat/lng, validates radius with `readRadius` (0 = All Kenya, else 400 m–40 km) and `isInKenya`.
4. `searchNearbyGyms` (`lib/osmPlaces.ts`) wraps `searchNearbyGymsUncached` in `withTtlCache` (5 min, key rounded to 4 decimals). Radius 0 returns `catalogAllGyms(center)`; otherwise `catalogNearbyGyms` is merged with a best-effort live Overpass query (`overpass()` -> throttle -> circuit breaker -> `fetchWithTimeout`), de-duplicated by `mergeGyms`.
5. Handler returns `{ gyms }` with `PLACE_CACHE_HEADERS` (`s-maxage=300`); on provider failure it returns `{ gyms: [], empty: true, warning }` with `no-store` (HTTP 200).
6. `GymFinderApp` stores `rawGyms`; `rankGyms(rawGyms, origin, profile, filters)` (`lib/scoreGyms.ts`) computes distance, score, filters and labels in a `useMemo`; `GymList` and `MapView` render the result.

### Text / place search

1. `PlaceSearch` suggests places locally via `suggestKenyaPlaces` (`lib/kenyaPlaces.ts`) - no network.
2. Picking a suggestion calls `goToPlace` -> `loadNearby(place.location, radius)`. Submitting free text calls `handleSearch`: a county match (`findCounty`) shortcuts to `loadNearby`; otherwise `fetchSearchGyms` hits `GET /api/places/search?q=`.
3. `app/api/places/search/route.ts` validates with `readBoundedQuery` (max 120 chars), rate-limits (12/min), then resolves in order: county -> local gazetteer place (`findLocalPlace`) -> `searchTextGyms` (catalog name/address match merged with one throttled Nominatim lookup when configured).

### Gym details

1. Selecting a gym sets `selectedId`; if the listing is not `listingComplete`, `fetchGymDetails` calls `GET /api/places/details?id=` (id must match `^(node|way|relation)/\d+$`).
2. `getPlaceDetails` returns the catalog entry directly, else a cached single-element Overpass lookup (`lib/osmPlaces.ts`). Result is merged back into `rawGyms`.

### Save / favourite flow

1. `toggleSave` updates `favorites` (ids) and `savedSnapshots` (full `Gym` objects) and persists both via `saveFavorites` / `saveSavedGyms` so saved gyms survive a change of search area.

**State Management:**
- All state is `useState` inside `components/GymFinderApp.tsx` (no store library, no context). Derived data uses `useMemo` (`rankedGyms`, `savedGyms`). Persistent state is `localStorage` only, accessed through `lib/storage.ts`.
- Server-side state is process-local Maps (`lib/ttlCache.ts`, `lib/requestSafety.ts`).

## Key Abstractions

**`Gym`:**
- Purpose: single listing shape used end to end (catalog JSON, API payloads, scoring, storage).
- Examples: `lib/types.ts` (type), `data/kenya-gyms.json` (data), `lib/osmPlaces.ts` (`mapElement` builds it from OSM tags).
- Pattern: plain data object; server returns `score: 0` / `distanceKm: null` / `labels: []` and the client fills them in. Fields inherited from a former Google Places shape (`photoName`, `googleMapsUri`, `priceLevel`) are kept for compatibility.

**`PlaceHit`:**
- Purpose: geocoded place suggestion (`county | town | suburb`).
- Examples: type exported from `lib/osmPlaces.ts`, produced by `lib/kenyaPlaces.ts`.
- Pattern: client imports it as a type only, so no server code is bundled.

**Resilient upstream call (composition of wrappers):**
- Purpose: never hammer community-run OSM services.
- Examples: `withTtlCache` -> `withCircuitBreaker` -> `withProviderThrottle` -> `fetchWithTimeout` in `lib/osmPlaces.ts` (`nominatimSearch`, `overpass`).
- Pattern: higher-order async wrappers in `lib/ttlCache.ts`; `seedTtlCache` pre-fills details from list results.

**`ClientProfile` / `GymFilters`:**
- Purpose: user preferences and filter state fed to `rankGyms`.
- Examples: `lib/types.ts` (`DEFAULT_PROFILE`, `DEFAULT_FILTERS`, `*_OPTIONS` constants used by forms).

**Plan builders:**
- Purpose: deterministic workout/meal generation from `PlanSettings`.
- Examples: `buildTrainingPlan`, `buildMealPlan` in `lib/planner.ts`.

## Entry Points

**Web page `/`:**
- Location: `app/page.tsx` (inside `app/layout.tsx`)
- Triggers: browser navigation.
- Responsibilities: render `GymFinderApp`.

**API routes:**
- `app/api/places/nearby/route.ts` - GET, nearby/nationwide listing.
- `app/api/places/search/route.ts` - GET, county/place/text search.
- `app/api/places/details/route.ts` - GET, single gym by OSM id.
- `app/api/places/geocode/route.ts` - GET, always `410 Gone` (remote autocomplete intentionally disabled).
- `app/api/places/photo/route.ts` - GET, always `404` (photos are not proxied).
- `app/api/map/static/route.ts` - GET, static-image basemap fallback via Esri export (503 in production unless `ESRI_EXPORT_URL` is set).

**Manifest:** `app/manifest.ts` served at `/manifest.webmanifest`.

**Service worker:** `public/sw.js` (served with no-cache headers per `next.config.ts`).

**CLI scripts:** `npm run fetch-gyms`, `npm run curate-gyms`, `npm run fetch-places` (`package.json`); `scripts/make-icons.mjs` run manually.

## Architectural Constraints

- **Threading:** Standard Node.js single-threaded request handling per instance; no workers. Client is a single browser main thread; MapLibre loaded via `next/dynamic` with `ssr: false` (`components/GymFinderApp.tsx`).
- **Global state:** Module-level mutable singletons, all process-local: `cached` catalog in `lib/kenyaGymCatalog.ts`; `values`/`pending`/`nextProviderRequest`/`providerFailures` Maps in `lib/ttlCache.ts`; `rateLimits` Map in `lib/requestSafety.ts`. These are not shared across serverless instances or restarts (documented in `README.md`).
- **Server-only modules lack a guard:** `lib/kenyaGymCatalog.ts` uses `node:fs` and `process.cwd()`, and `lib/osmPlaces.ts` / `lib/requestSafety.ts` read `process.env`; none import `server-only`. Client code must not import their runtime values (it only imports `type PlaceHit` from `lib/osmPlaces.ts`). The catalog read assumes `data/kenya-gyms.json` is present at `process.cwd()/data` at runtime.
- **Bundle weight:** `lib/kenya.ts` (boundary polygon) and `lib/kenyaPlaces.ts` (GeoNames index, ~600 places) import JSON and are used by client components, so both datasets ship in the client bundle.
- **Circular imports:** None detected. Dependency direction is components -> lib; `lib/kenyaPlaces.ts` -> `lib/osmPlaces.ts` is type-only.
- **Security headers / CSP:** Set globally in `next.config.ts` (`connect-src`/`img-src`/`font-src` allow only `self` and `https://tiles.openfreemap.org`; `frame-ancestors 'none'`). Any new external origin the browser calls must be added there. `script-src` allows `'unsafe-inline'` (and `'unsafe-eval'` in dev only).
- **Environment gating:** Behaviour differs by `NODE_ENV`: public Overpass/Nominatim/Esri defaults are dev-only (`lib/osmPlaces.ts`, `lib/mapUpstream.ts`); unidentified clients are rejected with 429 in production (`lib/requestSafety.ts`).
- **Path alias:** `@/*` maps to the repo root (`tsconfig.json`, mirrored in `vitest.config.mts`); there is no `src/` directory.

## Anti-Patterns

### Business logic inside the root client component

**What happens:** `components/GymFinderApp.tsx` (~520 lines) holds fetch orchestration, search branching, geolocation, favourites migration and layout composition in one component.
**Why it's wrong:** New features pile into one file and are untestable (component logic has no tests; only `lib/` is covered).
**Do this instead:** Put new pure logic in `lib/` with a `*.test.ts` beside it (pattern: `lib/scoreGyms.ts` + `lib/scoreGyms.test.ts`) and keep new panels as separate files in `components/`.

### Logic in route handlers

**What happens:** `app/api/places/search/route.ts` chooses between county, gazetteer and text search inline, including hard-coded radii (15000/12000/8000).
**Why it's wrong:** The decision tree is only testable through the HTTP handler and duplicates the client-side shortcut in `handleSearch`.
**Do this instead:** Add new resolution logic to `lib/osmPlaces.ts` / `lib/kenyaPlaces.ts` and keep handlers to validate -> rate-limit -> delegate -> respond, as `app/api/places/details/route.ts` does.

### Calling upstream providers without the safety wrappers

**What happens:** Any direct `fetch` to a public OSM service would bypass throttling and breaker logic.
**Why it's wrong:** The app is explicitly designed not to burst community-operated services (`README.md`, `lib/ttlCache.ts`).
**Do this instead:** Route every upstream call through `fetchWithTimeout` plus `withTtlCache` / `withProviderThrottle` / `withCircuitBreaker`, as in `overpass()` and `nominatimSearch()` in `lib/osmPlaces.ts`; do not add per-keystroke remote autocomplete (`app/api/places/geocode/route.ts` is deliberately `410`).

## Error Handling

**Strategy:** Fail soft toward the checked-in catalog; surface a human-readable `notice` in the UI rather than throwing.

**Patterns:**
- Listing endpoints (`nearby`, `search`) catch provider errors and return HTTP 200 with `{ gyms: [], empty: true, warning }` and `Cache-Control: no-store`; the client displays `warning` as the notice.
- Validation failures return `400` JSON `{ error }`; rate limit returns `429` with `Retry-After` (`tooMany` in `lib/requestSafety.ts`); `details` upstream failure returns `502`; unknown id returns `404`.
- `lib/osmPlaces.ts` swallows live-provider errors (`try/catch` around `overpass`) and falls back to catalog data; `lib/kenyaGymCatalog.ts` returns `[]` if the JSON cannot be read.
- Client `lib/placesClient.ts` throws `Error(payload.error)` on non-OK responses; `GymFinderApp` catches and sets `notice`.
- `lib/storage.ts` wraps every localStorage read in try/catch and falls back to defaults; some writers (`saveProfile`, `markOnboarded`, `dismissInstall`) are not wrapped.

## Cross-Cutting Concerns

**Logging:** None - no logger, no `console` usage in app code; errors are returned or swallowed.
**Validation:** Input validation lives in `lib/requestSafety.ts` (`readBoundedQuery`, `readRadius`) and route handlers (`isInKenya`, OSM id regex); output URLs are sanitised client-side by `safeExternalUrl` / `safeTelephoneUrl` in `lib/format.ts`.
**Authentication:** Not applicable - no accounts or auth; rate limiting is IP-based (`TRUSTED_CLIENT_IP_HEADER`, else right-most `X-Forwarded-For`).
**Caching:** HTTP (`PLACE_CACHE_HEADERS`), in-process TTL (`lib/ttlCache.ts`), service worker runtime cache (`public/sw.js`, cache name `gym-finder-v3`, bump on SW logic changes).
**CI:** `.github/workflows/quality.yml` runs `npm audit --omit=dev --audit-level=high` and `npm run check` (lint + vitest + build).

---

*Architecture analysis: 2026-10-29*
