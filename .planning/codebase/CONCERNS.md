# Codebase Concerns

**Analysis Date:** 2026-10-29

Scope: full repo (Next.js 16 App Router PWA, TypeScript, MapLibre, vitest). `.claude/` (GSD tooling) is excluded. `node_modules/` is not installed in this checkout, so lint, test and build were not executed; findings come from reading source. No TODO/FIXME/HACK markers exist in `app/`, `components/`, `lib/`, `scripts/` or `public/sw.js`. Absence of markers does not mean absence of debt, see below.

## Tech Debt

**Vestigial Google Places data model carried by an OSM-only app:**
- Issue: `Gym` in `lib/types.ts` still has `rating`, `userRatingCount`, `photoName`, `googleMapsUri`, `reviews`, and `priceLevel` values of the form `PRICE_LEVEL_*`. Every producer (`lib/osmPlaces.ts` `mapElement`, `scripts/fetch-kenya-gyms.mjs` `mapElement`) hard-codes `rating: null`, `userRatingCount: 0`, `photoName: null`, `reviews: []`. `googleMapsUri` actually holds an OpenStreetMap URL.
- Files: `lib/types.ts`, `lib/osmPlaces.ts`, `lib/scoreGyms.ts` (rating score, `top_rated` label, `minRating` filter), `lib/format.ts` (`starText`, `formatPrice` labels for five price tiers that can never occur), `components/GymDetail.tsx` (`sourceLink` reads `googleMapsUri`), `app/api/places/photo/route.ts`.
- Impact: dead scoring and filter branches (`ratingScore` is always 0; `top_rated` is never assigned; `applyFilters` with `minRating > 0` would drop every gym). New contributors will assume ratings, photos and price tiers exist. `starText` and `formatBudget` in `lib/format.ts` are exported but unused outside that file.
- Fix approach: rename `googleMapsUri` to `sourceUrl`, drop `rating`/`userRatingCount`/`reviews`/`photoName`, reduce `priceLevel` to a boolean `mappedFree`, and delete the dead branches and their tests in `lib/scoreGyms.test.ts`. Existing localStorage snapshots (`gym-finder-saved-gyms-v1` in `lib/storage.ts`) need a version bump or tolerant read.

**Dead or stub API routes and unused server functions:**
- Issue: `app/api/places/geocode/route.ts` always returns 410 and `app/api/places/photo/route.ts` always returns 404; no client code calls either. `geocodeKenyaPlaces` and `resolveKenyaPlace` in `lib/osmPlaces.ts` (lines 151-178) have no non-test callers. `GymFinderApp.tsx` line 165 still tests `selectedId.startsWith("demo-")` for a demo mode that no longer exists.
- Files: `app/api/places/geocode/route.ts`, `app/api/places/photo/route.ts`, `lib/osmPlaces.ts`, `components/GymFinderApp.tsx`
- Impact: extra public surface to rate-limit and review, misleading code paths.
- Fix approach: delete the two routes, the two unused exports, and the `demo-` guard.

**Logic duplicated between runtime and build scripts (drift risk):**
- Issue: `isFitnessVenue`, the point-in-polygon test, `addressFrom`, `priceFrom`, `typesFrom`, `openNowFrom`, and `mapElement` exist in both `lib/*.ts` and `scripts/fetch-kenya-gyms.mjs`. The point-in-polygon ring test appears three times (`lib/kenya.ts`, `scripts/fetch-kenya-gyms.mjs`, `scripts/fetch-kenya-places.mjs`). Kenya bounds are hard-coded again in the script query (`-4.9,33.75,5.57,41.91`). The runtime Overpass query (`gymQuery` in `lib/osmPlaces.ts`) differs from the build query in `scripts/fetch-kenya-gyms.mjs` (build adds `workout|bodybuild` and a `shop` clause). `openNowFrom` differs slightly (`hours === "24/7"` redundant check in the lib version).
- Files: `lib/fitnessVenue.ts`, `lib/kenya.ts`, `lib/osmPlaces.ts`, `scripts/fetch-kenya-gyms.mjs`, `scripts/fetch-kenya-places.mjs`
- Impact: a fix to filtering in one place silently leaves the other stale, so catalog content and live results can disagree. `lib/catalog.test.ts` is the only guard.
- Fix approach: move shared pure logic into a plain `.mjs`/`.ts` module imported by both (for example `lib/shared/venue.mjs`), or run the scripts through `tsx` and import the `lib/` modules.

**`GymFinderApp` is a 524-line orchestrator component with 14 `useState` hooks:**
- Issue: data fetching, persistence, selection, sheet layout state, geolocation and rendering are in one component. Three `eslint-disable react-hooks/exhaustive-deps` comments (`GymFinderApp.tsx` lines 147, 158; `MapView.tsx` line 115) suppress dependency checks. Mount-time effects use `queueMicrotask` and `setTimeout(…, 0)` to avoid cascading-render lint errors rather than restructuring state.
- Files: `components/GymFinderApp.tsx`, `components/MapView.tsx`
- Impact: difficult to change one concern without regressions; the radius-change effect (lines 150-159) reads `origin` without listing it, which is intentional but fragile.
- Fix approach: extract a `useGymSearch` hook (fetch, request sequencing, notice), a `useSavedGyms` hook (favorites plus snapshots plus storage), and a reducer for `sheetMode`/`sheetSize`.

**Client bundle pulls in server-oriented modules and large JSON:**
- Issue: `components/PlaceSearch.tsx` imports `lib/kenyaPlaces.ts` which statically imports `data/kenya-places.json` (about 119 KB). `lib/kenya.ts` imports `data/kenya-boundary.json` (about 35 KB, 1,622 ring vertices) and is imported by client code. `PlaceHit` is defined in `lib/osmPlaces.ts`, a server module that reads `process.env` at import time, and is imported (type-only) by client components.
- Files: `lib/kenyaPlaces.ts`, `lib/kenya.ts`, `lib/osmPlaces.ts`, `components/PlaceSearch.tsx`, `components/GymFinderApp.tsx`
- Impact: about 150 KB of JSON ships in the main client chunk for autocomplete and `isInKenya` checks. Type-only coupling to a server file is easy to turn into a real import by mistake.
- Fix approach: move `PlaceHit` to `lib/types.ts`; lazy-load the gazetteer on first keystroke; keep boundary checks server-side or load the polygon lazily.

**Module-load-time environment reads:**
- Issue: `OVERPASS_ENDPOINTS`, `NOMINATIM_URL`, `USER_AGENT` are computed at import time in `lib/osmPlaces.ts` (lines 12-25).
- Impact: tests that call `vi.stubEnv` after import cannot change them; behaviour differs between `next dev` and `next start` with no runtime override.
- Fix approach: resolve inside functions (like `resolveEsriExportUrl()` in `lib/mapUpstream.ts` already does).

**Vegetarian meal plan built with string replacement:**
- Issue: `VEGETARIAN` in `lib/planner.ts` (lines 484-489) derives from `OMNIVORE` using chained `.replace(/Chicken/g, …)` calls. Case-sensitive, order-dependent, and breaks silently if a new omnivore dish says "chicken" or "Fish" in a new position.
- Files: `lib/planner.ts`
- Impact: nonsensical or still-meat meals after an edit; only `lib/planner.test.ts` (28 lines) guards it.
- Fix approach: define vegetarian meals as explicit data, and add a test asserting no meat or fish word appears in the vegetarian output.

## Known Bugs

**Unguarded `localStorage` writes can break the onboarding and profile flow:**
- Symptoms: In Safari private mode, with storage disabled, or when quota is exceeded, `saveProfile`, `markOnboarded` and `dismissInstall` throw. In `components/GymFinderApp.tsx` the onboarding `onSubmit` (line 306-310) calls `saveProfile(profile)` then `markOnboarded()` then `closeToList()`; a throw prevents `closeToList()`, leaving the user stuck on the onboarding sheet. `saveFavorites`/`saveSavedGyms` are guarded, creating an inconsistent contract.
- Files: `lib/storage.ts` (lines 20-22, 46-48, 54-56), `components/GymFinderApp.tsx`, `components/InstallPrompt.tsx` (`hide` calls `dismissInstall`)
- Trigger: open the app with `localStorage.setItem` throwing (private mode or full quota).
- Workaround: none for the user. Fix by wrapping every setter in `try/catch` like `saveFavorites`.

**Stale-response race in search and radius changes:**
- Symptoms: `loadNearby` and `handleSearch` in `components/GymFinderApp.tsx` (lines 118-137, 234-266) do not abort or sequence requests. If the user changes radius twice, pans and taps "Search this area", or searches while a nearby request is in flight, an older slower response can overwrite newer results, `origin`, and `resultScope`, and `setLoading(false)` fires when the first request finishes while another is still pending.
- Files: `components/GymFinderApp.tsx`, `lib/placesClient.ts`
- Trigger: rapid radius changes or searches on a slow network (the server throttle in `lib/ttlCache.ts` also makes some responses slower).
- Workaround: none. Fix with an `AbortController` or a monotonically increasing request id compared before applying state.

**Client assumes every response body is JSON:**
- Symptoms: `fetchNearbyGyms`, `fetchSearchGyms` and `fetchGymDetails` in `lib/placesClient.ts` (lines 22, 35, 44) call `response.json()` before checking `response.ok`. A platform HTML error page (502/504, edge 429 from a CDN) throws `SyntaxError: Unexpected token '<'`, which `GymFinderApp` shows verbatim in the notice toast.
- Files: `lib/placesClient.ts`, `components/GymFinderApp.tsx`
- Trigger: any non-JSON error from the host or CDN.
- Workaround: none. Parse inside `try/catch` and fall back to `response.statusText` (the unused `readError` helper already does this).

**Service worker evicts its own app shell:**
- Symptoms: `cacheRuntime` in `public/sw.js` (lines 45-52) trims `cache.keys()` to the newest 120 entries with `keys.slice(0, …)`. Cache keys are in insertion order, so the precached `/`, manifest and icons (inserted first) are the first deleted once more than 120 runtime assets accumulate. The offline fallback `caches.match("/")` then returns nothing.
- Files: `public/sw.js`
- Trigger: browsing long enough to cache more than about 120 script/style/image/font requests (map style assets, hashed chunks across several deploys).
- Workaround: none. Use a separate cache name for the shell, or skip deletion of precached URLs.

**Degraded results are cached as if complete:**
- Symptoms: in `searchNearbyGymsUncached` (`lib/osmPlaces.ts` lines 331-355), if live Overpass is throttled ("Map search is briefly busy"), tripped by the circuit breaker, or unconfigured, the error is swallowed and a catalog-only list is returned. `withTtlCache` then stores that list for 5 minutes and the route sends `public, s-maxage=300` cache headers (`PLACE_CACHE_HEADERS` in `lib/requestSafety.ts`), so a CDN can serve the thin result for that key even after Overpass recovers.
- Files: `lib/osmPlaces.ts`, `lib/ttlCache.ts`, `lib/requestSafety.ts`, `app/api/places/nearby/route.ts`
- Trigger: two non-cached nearby requests within 1.1 s (the per-process throttle in `OVERPASS_INTERVAL_MS`).
- Workaround: none. Do not cache, or use a shorter TTL and `no-store`, when the live call failed.

**Search coverage depends on a 58-venue catalog:**
- Symptoms: `data/kenya-gyms.json` holds 58 gyms for all of Kenya (`count: 58`, generated 2026-09-17, curated 2026-09-26). 36 of the 58 have the placeholder address "Kenya", 10 have a phone, 8 have a website, 2 are marked 24/7. In production, `OVERPASS_ENDPOINTS` defaults to empty (`lib/osmPlaces.ts` lines 13-18), so live lookups always fail and the catalog is the only source. Text search for a place not in `data/kenya-places.json` or a gym name not in the catalog returns nothing (`searchTextGyms`, Nominatim disabled in production).
- Files: `data/kenya-gyms.json`, `lib/osmPlaces.ts`, `lib/kenyaGymCatalog.ts`, `app/api/places/search/route.ts`
- Trigger: any production search away from the handful of catalogued venues. The UI title "N in Kenya" and onboarding copy ("Train anywhere in Kenya") overstate coverage.
- Workaround: configure authorised `OVERPASS_ENDPOINTS` in production (documented in `.env.example`). Longer term, widen `scripts/fetch-kenya-gyms.mjs`, review why the extract is so small versus actual OSM density, and add a coverage-count check to `npm run fetch-gyms`.

**"Open now" filter and badge only mean "mapped as 24/7":**
- Symptoms: `openNowFrom` returns `true` only when `opening_hours` contains `24/7`, otherwise `null`; `applyFilters` hides every venue without that tag when the toggle is on. The filter label was renamed "Open 24/7" in `components/FilterSheet.tsx` but the state key is still `openNow` (`lib/types.ts`, `lib/scoreGyms.ts`) and `AMENITY_KEYWORDS.open_24h` uses loose substrings (`"24"`) that match addresses or phone fragments.
- Files: `lib/osmPlaces.ts`, `lib/scoreGyms.ts`, `components/FilterSheet.tsx`, `components/GymDetail.tsx`
- Impact: with 2 of 58 catalog venues tagged 24/7, enabling the filter yields near-empty lists. `"24"` matches any text containing "24" (for example "Street 24"), inflating `amenityScore`.
- Fix approach: rename to `open247`, parse `opening_hours` with a real parser if "open now" is desired, and tighten keyword matching to word boundaries.

## Security Considerations

**Client IP detection and the rate limiter:**
- Risk: `clientIdentity` in `lib/requestSafety.ts` uses the right-most `X-Forwarded-For` hop, or `TRUSTED_CLIENT_IP_HEADER`, or a list of platform headers. In production, a request with no identifiable IP gets a 429 (`rateLimit`, lines 119-122). Behind two proxy layers (CDN plus load balancer) the right-most hop is the inner proxy, so all visitors share one bucket and are throttled together. Running `next start` directly (no proxy) with no forwarded headers rejects every API call. Any header-based source can be spoofed if the origin is reachable directly.
- Files: `lib/requestSafety.ts`, `.env.example`
- Current mitigation: header allow-list, IP normalisation via `node:net` `isIP`, LRU eviction at 1,000 buckets, tests in `lib/requestSafety.test.ts`.
- Recommendations: document the required hosting topology next to `TRUSTED_CLIENT_IP_HEADER`; add a startup warning when `NODE_ENV=production` and the variable is unset; move to a platform or shared-store limiter (Vercel Firewall, Upstash) before real traffic. With only 1,000 tracked keys, a distributed client set can evict live buckets and reset their quotas.

**Rate limiter and caches are per-process only:**
- Risk: `rateLimits`, `values`, `pending`, `providerFailures`, `nextProviderRequest` (`lib/requestSafety.ts`, `lib/ttlCache.ts`) are module-level maps. Serverless instances each have their own copy, so effective limits scale with instance count and public Overpass or Nominatim etiquette (1 request per second) is not enforced globally.
- Files: `lib/requestSafety.ts`, `lib/ttlCache.ts`
- Current mitigation: comments and README acknowledge this.
- Recommendations: shared KV for limiter, cache and breaker state before enabling `OVERPASS_ENDPOINTS` against a public endpoint.

**Content Security Policy allows inline scripts in production:**
- Risk: `next.config.ts` sets `script-src 'self' 'unsafe-inline'` (production) and adds `'unsafe-eval'` in development. `'unsafe-inline'` also permits `javascript:` URLs and inline handlers, weakening XSS protection. `style-src 'unsafe-inline'` is also present.
- Files: `next.config.ts`
- Current mitigation: React escaping; external URLs from OSM tags pass through `safeExternalUrl` and `safeTelephoneUrl` (`lib/format.ts`), restricting to http(s) and digit-only `tel:`; `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`.
- Recommendations: move to a nonce-based CSP via `proxy`/middleware (check `node_modules/next/dist/docs/` for the Next 16 convention, as AGENTS.md warns APIs differ) once dynamic rendering is acceptable.

**Raw error messages returned to clients:**
- Risk: `app/api/places/details/route.ts` (line 25) returns `error.message` in a 502; `nearby` and `search` routes return `error.message` as `warning` with status 200. Messages come from internal code (for example "Overpass failed (503)") and reveal upstream provider names and status codes.
- Files: `app/api/places/details/route.ts`, `app/api/places/nearby/route.ts`, `app/api/places/search/route.ts`
- Current mitigation: messages are short and carry no secrets; there is no logging at all (`console` is never used).
- Recommendations: map to fixed user-facing strings and log the detail server-side.

**User-controlled text in upstream URLs and cache keys:**
- Risk: `searchTextGyms` builds a Nominatim query from user input (`q` up to 120 chars). Only reachable in development or with `NOMINATIM_URL` configured. Cache key `nominatim:${normalized}:${limit}` allows up to 300 distinct entries to be pushed through by one client within rate limits (12 per minute per IP).
- Files: `lib/osmPlaces.ts`, `lib/requestSafety.ts` (`readBoundedQuery`)
- Current mitigation: length cap, rate limit, `URLSearchParams` encoding, `countrycodes=ke`.
- Recommendations: acceptable as-is; revisit if a shared cache is introduced.

**Geolocation and saved data privacy:**
- Risk: saved gym snapshots are stored whole in `localStorage` (`gym-finder-saved-gyms-v1`) with no cap or expiry. Precise coordinates are sent to `/api/places/nearby` only after the user taps "Near me", and are not persisted (confirmed by `locateMe` in `GymFinderApp.tsx`).
- Files: `lib/storage.ts`, `components/GymFinderApp.tsx`
- Current mitigation: opt-in geolocation, notice text, no server accounts.
- Recommendations: cap the snapshot list (for example 100) and store only ids plus refreshable fields.

## Performance Bottlenecks

**Nationwide mode returns and caches the whole catalog per origin:**
- Problem: the default `radiusMeters` is 0 (`DEFAULT_FILTERS` in `lib/types.ts`). Every load calls `catalogAllGyms(center)` which maps, sorts and returns every gym, and `searchNearbyGyms` caches one full copy per `center.lat:lng` key (max 300 entries). `catalogGymById` uses a linear `find`.
- Files: `lib/kenyaGymCatalog.ts`, `lib/osmPlaces.ts`, `lib/ttlCache.ts`
- Cause: no pagination or bounding box; fine at 58 gyms, scales linearly in payload size, CPU per request and cache memory when the catalog grows to thousands.
- Improvement path: cap nationwide responses (nearest N), return slim list fields and fetch detail separately, build an id `Map` once in `loadCatalog`, and key nationwide cache without the centre.

**Client re-ranks and redraws everything on each change:**
- Problem: `rankGyms` recomputes `haystack()` string concatenation and keyword counts for every gym on each filter, profile or origin change (`lib/scoreGyms.ts`). `MapView.tsx` removes and recreates every DOM marker on each `moveend` and each `gyms`/`selectedId` change (lines 141-174). `GymList` renders all gyms without virtualisation and does `favorites.includes` per card.
- Files: `lib/scoreGyms.ts`, `components/MapView.tsx`, `components/GymList.tsx`
- Cause: no memoised per-gym text, no marker reuse, no clustering.
- Improvement path: precompute lowercase haystack once per gym, diff markers by id, move to a GeoJSON symbol or cluster layer, and virtualise the list before the catalog exceeds a few hundred entries.

**Per-process JSON catalog load:**
- Problem: `loadCatalog` in `lib/kenyaGymCatalog.ts` reads `data/kenya-gyms.json` synchronously with `readFileSync(path.join(process.cwd(), …))` on first call per instance. The catch block returns an empty array and permanently caches it (`cached = []`).
- Files: `lib/kenyaGymCatalog.ts`
- Cause: filesystem path built from `process.cwd()` can miss the bundled file on some serverless layouts, and the failure is silent.
- Improvement path: `import` the JSON (as `lib/kenyaPlaces.ts` does) so the bundler includes it, or log and do not cache on failure.

## Fragile Areas

**Service worker caching strategy:**
- Files: `public/sw.js`, `components/ServiceWorkerRegister.tsx`
- Why fragile: the cache name `gym-finder-v3` is bumped by hand; there is no `skipWaiting` or update prompt, so users can run an old shell against new API shapes. Precaching parses `/` HTML with a regex for `/_next/static/` URLs (lines 23-29), which misses lazily loaded chunks such as the dynamically imported `MapView`. API calls are network-only (`/api/` branch), so offline use shows an empty shell with no gyms. Cross-origin map tiles are not handled.
- Safe modification: change `CACHE` on every behavioural change to this file; test with Chrome DevTools offline and "Update on reload"; keep the `/sw.js` no-cache headers in `next.config.ts`.
- Test coverage: none. `public/sw.js` is not exercised by vitest.

**Point-in-polygon Kenya boundary:**
- Files: `lib/kenya.ts`, `data/kenya-boundary.json`, `scripts/fetch-kenya-gyms.mjs`
- Why fragile: the boundary is simplified to 0.004 degrees (about 450 m). Gyms or users within that distance of the border or coast can be rejected, and `isInKenya` walks all 108 polygons per call. `KENYA_BOUNDS` in `lib/kenya.ts` and `KENYA_MAP_BOUNDS` in `lib/mapBounds.ts` are separately maintained rectangles.
- Safe modification: keep `lib/catalog.test.ts` boundary cases (Mombasa, Butiama, Kampala) and add border and coast cases when changing the polygon.
- Test coverage: adequate for interior points only.

**Overpass and Nominatim provider layer:**
- Files: `lib/osmPlaces.ts`, `lib/ttlCache.ts`
- Why fragile: three stacked wrappers (`withTtlCache` -> `withCircuitBreaker` -> `withProviderThrottle`) have subtle interactions: the throttle slot is consumed before the call and concurrent callers get an exception; the breaker never half-opens explicitly (after cooldown the first failure re-opens it because `failures` is retained); `overpass()` swallows each endpoint's error and rethrows a generic message.
- Safe modification: add tests in `lib/ttlCache.test.ts` and `lib/osmPlaces.test.ts` for each new interaction before changing order of wrappers.
- Test coverage: `lib/ttlCache.test.ts` (32 lines) and `lib/osmPlaces.test.ts` (30 lines) are light; the Overpass fallback chain is not tested end-to-end.

**Persisted client state without validation:**
- Files: `lib/storage.ts`, `components/Planner.tsx`
- Why fragile: `loadProfile` takes `stored.goals` and `stored.amenities` as-is. A corrupted or hand-edited value (non-array, or a goal key not in `GOAL_KEYWORDS`) makes `scoreGym` throw (`profile.goals.reduce`, `GOAL_KEYWORDS[goal]` undefined passed to `keywordHits`). `loadFavorites` returns unchecked JSON, and `favorites.includes` crashes if it is not an array. `Planner` spreads stored settings over defaults without validating `goal`, `level`, `venue`, `diet`. Key naming is inconsistent (`gym-finder-*` in `lib/storage.ts` versus `kaya-plan-*` in `components/Planner.tsx`) and Planner reads storage directly rather than via `lib/storage.ts`.
- Safe modification: validate with type guards (as `loadSavedGyms` already does) and add a schema version.
- Test coverage: none for `lib/storage.ts`.

**Map fallback logic:**
- Files: `components/MapView.tsx`, `app/api/map/static/route.ts`, `lib/mapUpstream.ts`
- Why fragile: fallback triggers after 7 s without loaded tiles or 4 `error` events; style or sprite errors count the same as tile errors. In production the static fallback returns 503 unless `ESRI_EXPORT_URL` is set, so the fallback `<img>` renders broken with alt text "Map fallback". The fallback image uses a fixed span (0.18 degrees) regardless of zoom and is tied to `origin` at render time, not the current map centre.
- Safe modification: handle `onError` on the fallback `<img>`; surface a visible message when the static map is unavailable.
- Test coverage: `lib/mapRoute.test.ts` covers the route, nothing covers `MapView`.

**Vegetarian and plan generation:**
- Files: `lib/planner.ts`, `components/Planner.tsx`
- Why fragile: see the string-replace concern above. `Planner` also resets `completed` whenever any setting changes (`change()` in `components/Planner.tsx`), including the diet selector which does not affect the training plan, discarding progress.
- Safe modification: reset progress only when `goal`, `level`, `days` or `venue` change.
- Test coverage: `lib/planner.test.ts` only (28 lines).

## Scaling Limits

**Catalog size and freshness:**
- Current capacity: 58 venues, 608 places (`data/kenya-gyms.json`, `data/kenya-places.json`), checked into git (about 39 KB and 119 KB).
- Limit: growth to thousands of venues stresses payload size, in-memory ranking and DOM markers (see Performance). The data is refreshed only by manually running `npm run fetch-gyms` / `npm run fetch-places`; no scheduled job exists in `.github/workflows/quality.yml`, so the catalog ages silently (current `generatedAt` is 2026-09-17).
- Scaling path: scheduled CI job opening a PR with refreshed data; move to a database or tile-based index for large catalogs.

**Per-instance rate limit, cache and throttle:**
- Current capacity: 1,000 tracked client keys, 300 cached entries, 1 Overpass call per 1.1 s per instance.
- Limit: horizontal scaling multiplies upstream load and breaks quota accuracy.
- Scaling path: shared KV (Redis/Upstash/Vercel KV) for `lib/requestSafety.ts` and `lib/ttlCache.ts` state.

## Dependencies at Risk

**Locked Next.js 16.4.0 has critical security advisories:**
- Risk: `npm audit --omit=dev` reports `next` 16.0.0 - 16.4.0 as critical: unauthenticated RCE in the Image Optimization API with SVGs (GHSA-2464-fhr4-w9xw), unauthenticated RCE in `use cache` functions returning typed arrays (GHSA-673q-mjm6-r5xr), and a Server Actions DoS (GHSA-p3m5-59mp-jv5r). `package-lock.json` pins 16.4.0.
- Impact: the `npm audit --omit=dev --audit-level=high` step in `.github/workflows/quality.yml` fails, so CI stays red, and production builds ship the vulnerable version.
- Migration plan: bump `next` and `eslint-config-next` to `^16.4.3`, regenerate `package-lock.json` with `npm install`, and re-run `npm run check`.

**Pinned-major framework with documented breaking changes:**
- Risk: `next ^16.4.0` (lock: 16.4.0) and `AGENTS.md` warns APIs differ from common knowledge. Code already uses Next 16 specifics (`LayoutProps<"/">` in `app/layout.tsx`, `turbopack.root` in `next.config.ts`). Any future change to `headers()`, middleware/proxy, caching or route handlers must be checked against `node_modules/next/dist/docs/`.
- Impact: copying older App Router patterns can fail at build or silently change caching.
- Migration plan: read the relevant guide in `node_modules/next/dist/docs/` before each change; keep `npm run check` in CI.

**Caret ranges on fast-moving majors:**
- Risk: `maplibre-gl ^6.9.1`, `vitest ^4.1.11`, `eslint ^9`, `tailwindcss ^4` use caret ranges, while `react`/`react-dom` are exact-pinned to `19.2.8`. `@types/node ^20` does not match CI's `node-version: 24` (`.github/workflows/quality.yml`). No `engines` field or `.nvmrc` pins the Node version.
- Impact: type definitions diverge from runtime APIs; contributors may run different Node majors. `package-lock.json` limits drift in CI (`npm ci`).
- Migration plan: add `engines` and `.nvmrc`, align `@types/node` with the CI Node major.

**External free services with no SLA:**
- Risk: OpenFreeMap style/tiles (`https://tiles.openfreemap.org/styles/liberty` in `components/MapView.tsx`, allow-listed in the CSP), public Overpass endpoints, public Nominatim, Esri World Street Map (dev only), GeoNames dump. README states OpenFreeMap has no uptime guarantee.
- Impact: the map goes blank (falls back to a static image that is itself unconfigured in production).
- Migration plan: self-host or contract a tile provider; set `ESRI_EXPORT_URL` to a licensed service.

## Missing Critical Features

**Observability and operational hygiene:**
- Problem: no logging, error tracking or metrics anywhere (`console.*` is never used in `app/`, `components/`, `lib/`). More than a dozen `catch {}` blocks swallow errors silently (`lib/osmPlaces.ts`, `lib/kenyaGymCatalog.ts`, `lib/storage.ts`, `public/sw.js`, `components/*`). Upstream outages, an unreadable catalog file, or an exhausted circuit breaker are invisible.
- Blocks: diagnosing production issues; knowing when the catalog failed to load or live data stopped.

**No deployment pipeline or environment documentation beyond `.env.example`:**
- Problem: `.github/workflows/quality.yml` runs lint, tests, build, and `npm audit --omit=dev --audit-level=high` but nothing deploys or smoke-tests the built app. The hosting target and required proxy header topology are not stated.
- Blocks: confidence that the production rate limiter and catalog loading behave correctly on the real host.

**Accounts, verification, lead delivery, payments:**
- Problem: explicitly out of scope per README ("no accounts, owner verification, lead delivery, payments"). Listings are labelled "Community mapped - not yet verified" (`components/GymDetail.tsx`).
- Blocks: any monetisation or verified-listing feature.

## Test Coverage Gaps

**Route handlers other than the static map:**
- What's not tested: `app/api/places/nearby/route.ts`, `search/route.ts`, `details/route.ts` (validation, 400/404/502 paths, `warning` degradation, cache headers); `geocode` and `photo` stubs.
- Files: `app/api/places/*/route.ts`
- Risk: regressions in input validation or error shape reach production unnoticed; only `lib/mapRoute.test.ts` imports a route.
- Priority: High

**React components and client orchestration:**
- What's not tested: all of `components/*.tsx` (search sequencing, onboarding, saved-gym migration effect, geolocation, install prompt, filters, planner progress). No component test library or jsdom environment is configured in `vitest.config.mts`.
- Files: `components/GymFinderApp.tsx`, `components/MapView.tsx`, `components/PlaceSearch.tsx`, `components/Planner.tsx`, `components/InstallPrompt.tsx`
- Risk: the race and storage bugs above are untested; UI refactors are unprotected.
- Priority: High

**Storage, API client, and service worker:**
- What's not tested: `lib/storage.ts`, `lib/placesClient.ts`, `public/sw.js`, `lib/fitnessVenue.ts` (indirectly via `lib/catalog.test.ts` only), `lib/mapUpstream.ts` (partly via the map route test), `lib/cover.ts`.
- Risk: storage failure modes, non-JSON responses, and cache eviction bugs.
- Priority: Medium

**Build scripts and data pipeline:**
- What's not tested: `scripts/fetch-kenya-gyms.mjs`, `scripts/fetch-kenya-places.mjs`, `scripts/make-icons.mjs`. Nothing asserts a minimum catalog size or address completeness after a refresh, which is how a 58-venue, 62%-placeholder-address catalog can ship.
- Risk: a bad Overpass response overwrites `data/kenya-gyms.json` (written non-atomically, no minimum-count guard in `scripts/fetch-kenya-gyms.mjs`, unlike the 100-place guard in `scripts/fetch-kenya-places.mjs`).
- Priority: Medium

**End-to-end and accessibility:**
- What's not tested: no Playwright/Cypress, no keyboard or screen-reader checks of the combobox in `components/PlaceSearch.tsx`, no PWA install or offline test. `npm run check` is the only gate.
- Priority: Low

---

*Concerns audit: 2026-10-29*
