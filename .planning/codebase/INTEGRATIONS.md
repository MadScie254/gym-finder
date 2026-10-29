# External Integrations

**Analysis Date:** 2026-10-29

## APIs & External Services

**Basemap / Map Tiles:**
- OpenFreeMap - Keyless vector tiles and style for the interactive map
  - Style URL: `https://tiles.openfreemap.org/styles/liberty` (`components/MapView.tsx`)
  - SDK/Client: `maplibre-gl` (called directly from the browser; the app does not proxy tiles)
  - Auth: None (keyless). Allowed in CSP `connect-src`, `font-src`, `img-src` in `next.config.ts`.

**Static Map Fallback:**
- Esri ArcGIS World Street Map export - Fallback static map image served by `app/api/map/static/route.ts`
  - Default (dev only): `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/export` (`lib/mapUpstream.ts`)
  - Production: returns 503 unless `ESRI_EXPORT_URL` (https) is set to a licensed upstream
  - Client: native `fetch` via `fetchWithTimeout` (10 s timeout), content type validated by `imageContentType` in `lib/mapUpstream.ts`
  - Auth: `ESRI_EXPORT_URL` (URL only; no key handling in code)

**Gym / POI Data (OpenStreetMap):**
- Overpass API - Runtime supplement for nearby/text gym searches (`lib/osmPlaces.ts`)
  - Dev defaults: `https://overpass-api.de/api/interpreter`, `https://overpass.kumi.systems/api/interpreter`
  - Production: empty unless `OVERPASS_ENDPOINTS` (comma-separated, https only) is set
  - Protections: min spacing `OVERPASS_INTERVAL_MS = 1_100`, `withProviderThrottle`, `withCircuitBreaker`, `withTtlCache` from `lib/ttlCache.ts`
  - Auth: None; identifies via `OSM_USER_AGENT` (defaults to `KenyaGymFinder/1.0 (...)`)
- Nominatim (OSM geocoder) - Text place search after explicit form submission only (`nominatimSearch` in `lib/osmPlaces.ts`)
  - Dev default: `https://nominatim.openstreetmap.org/search`
  - Production: disabled unless `NOMINATIM_URL` (https) is set
  - Autocomplete is intentionally disabled: `app/api/places/geocode/route.ts` returns HTTP 410
- Local-first catalog (no network): `lib/kenyaGymCatalog.ts` serves `data/kenya-gyms.json`; `lib/kenyaPlaces.ts` serves `data/kenya-places.json`; `lib/kenya.ts` uses `data/kenya-boundary.json`. These satisfy default production behavior without any upstream.

**Data Refresh Sources (offline scripts, not runtime):**
- Overpass endpoints (`overpass-api.de`, `lz4.overpass-api.de`, `overpass.private.coffee`) - `scripts/fetch-kenya-gyms.mjs` (`npm run fetch-gyms`, `npm run curate-gyms`) writes `data/kenya-gyms.json`
- GeoNames Kenya dump `https://download.geonames.org/export/dump/KE.zip` - `scripts/fetch-kenya-places.mjs` (`npm run fetch-places`) writes `data/kenya-places.json`; parsed with Node `zlib`, no extra deps; CC BY 4.0 attribution shown in `components/GymFinderApp.tsx`
- geoBoundaries gbOpen Kenya ADM0 (RCMRD GeoPortal) - source of the checked-in `data/kenya-boundary.json` (no fetch script detected)

**Fonts:**
- Google Fonts via `next/font/google` (`Bricolage_Grotesque`, `Figtree`) in `app/layout.tsx` - downloaded at build time by Next.js and self-hosted; no runtime request to Google

**Outbound Links Only (no API calls):**
- Google Maps directions deep link `https://www.google.com/maps/dir/?api=1&destination=...` in `lib/format.ts` (no key, opens externally)
- OpenStreetMap element URLs (`https://www.openstreetmap.org/{type}/{id}`) stored as `googleMapsUri` in `lib/osmPlaces.ts` and the fetch script
- WHO guidance links and OSM/OpenFreeMap/GeoNames attribution links in `components/Planner.tsx` and `components/GymFinderApp.tsx`

**Explicitly not used:**
- Google Places API (stub routes remain: `app/api/places/photo/route.ts` returns 404; `lib/placesClient.ts` is the client-side wrapper for the internal `/api/places/*` routes)

## Internal API Routes (consumed by the browser)

- `GET /api/places/nearby` - `app/api/places/nearby/route.ts` (30 req/min per client)
- `GET /api/places/search` - `app/api/places/search/route.ts` (12 req/min per client)
- `GET /api/places/details` - `app/api/places/details/route.ts` (30 req/min per client; id must match `^(node|way|relation)/\d+$`)
- `GET /api/places/geocode` - disabled (410)
- `GET /api/places/photo` - disabled (404)
- `GET /api/map/static` - `app/api/map/static/route.ts` (24 req/min per client)
- Shared validation / limiter / cache headers: `lib/requestSafety.ts`

## Data Storage

**Databases:**
- None. No database, ORM, or connection string. Verified: no DB client in `package.json`.

**File Storage:**
- Local filesystem only: checked-in JSON datasets in `data/` and static assets in `public/`.
- Browser `localStorage` for visitor-local profile, favorites, saved gyms, onboarding/install flags, and plan progress (`lib/storage.ts`, `components/Planner.tsx`).

**Caching:**
- In-process memory only: `lib/ttlCache.ts` (max 300 entries, request coalescing) and rate-limit map in `lib/requestSafety.ts`. Per-instance; not shared across serverless isolates.
- HTTP caching via `PLACE_CACHE_HEADERS` (`lib/requestSafety.ts`) and static-map `Cache-Control` headers.
- Service worker cache `gym-finder-v3` in `public/sw.js`.

## Authentication & Identity

**Auth Provider:**
- None. No accounts, sessions, owner verification, or payments (stated in `README.md`).
  - Implementation: anonymous; client identity for rate limiting derived from `TRUSTED_CLIENT_IP_HEADER`, else right-most `X-Forwarded-For`, else platform IP headers (`lib/requestSafety.ts`).
  - Browser geolocation ("Near me") is requested only on user action; coordinates are used for that lookup only.

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry or similar).

**Logs:**
- No logging framework; route handlers return JSON error/warning payloads (`app/api/places/*/route.ts`). Analytics: none detected.

## CI/CD & Deployment

**Hosting:**
- Not declared in repo (no `vercel.json`, Dockerfile, or deploy config). Serverless-style hosting is implied by comments in `lib/requestSafety.ts`; `.vercel` is git-ignored.

**CI Pipeline:**
- GitHub Actions: `.github/workflows/quality.yml` - triggers on pull requests and pushes to `master`; Node 24, `npm ci`, `npm audit --omit=dev --audit-level=high`, then `npm run check` (lint, test, build); read-only `contents` permission, 10 min timeout; actions `actions/checkout@v5`, `actions/setup-node@v5`.
- Source repo: `https://github.com/MadScie254/gym-finder` (referenced in user-agent strings).

## Environment Configuration

**Required env vars:**
- None required. Optional (all server-side, names only): `OVERPASS_ENDPOINTS`, `NOMINATIM_URL`, `OSM_USER_AGENT`, `ESRI_EXPORT_URL`, `TRUSTED_CLIENT_IP_HEADER`.
- Recommended in production: `TRUSTED_CLIENT_IP_HEADER` (otherwise right-most `X-Forwarded-For` is used, and requests with no identifiable IP are rejected with 429); `ESRI_EXPORT_URL` only if the static-map fallback is wanted; authorised `OVERPASS_ENDPOINTS` / `NOMINATIM_URL` only if contracted.

**Secrets location:**
- No secrets are required by current code. `.env.example` is committed as a template; real `.env*` files are git-ignored (`.gitignore`). No env files other than `.env.example` were found.

## Webhooks & Callbacks

**Incoming:**
- None.

**Outgoing:**
- None.

---

*Integration audit: 2026-10-29*
