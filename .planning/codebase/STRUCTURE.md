# Codebase Structure

**Analysis Date:** 2026-10-29

## Directory Layout

```
gym-finder/
├── app/                        # Next.js App Router (no src/ directory)
│   ├── api/
│   │   ├── map/static/route.ts     # Static basemap image fallback (Esri export proxy)
│   │   └── places/
│   │       ├── nearby/route.ts     # GET nearby / nationwide gyms
│   │       ├── search/route.ts     # GET county / place / text search
│   │       ├── details/route.ts    # GET one gym by OSM id
│   │       ├── geocode/route.ts    # GET -> always 410 (autocomplete disabled)
│   │       └── photo/route.ts      # GET -> always 404 (no photo proxy)
│   ├── layout.tsx              # Root layout: fonts, metadata, viewport, SW registrar
│   ├── page.tsx                # "/" -> renders <GymFinderApp />
│   ├── manifest.ts             # PWA manifest (/manifest.webmanifest)
│   ├── globals.css             # Tailwind v4 import, design tokens, hand-written classes
│   └── favicon.ico
├── components/                 # "use client" React components (flat, PascalCase)
│   ├── GymFinderApp.tsx        # Root client component: all state + orchestration
│   ├── MapView.tsx             # MapLibre map (loaded via next/dynamic, ssr:false)
│   ├── GymList.tsx / GymCard.tsx / GymDetail.tsx
│   ├── FilterSheet.tsx / ProfileForm.tsx / Planner.tsx / PlaceSearch.tsx
│   └── InstallPrompt.tsx / ServiceWorkerRegister.tsx
├── lib/                        # Domain logic, helpers, types; tests co-located
│   ├── types.ts                # Shared types, defaults, option constants
│   ├── osmPlaces.ts            # Server orchestrator: catalog + Overpass/Nominatim
│   ├── kenyaGymCatalog.ts      # Reads data/kenya-gyms.json (node:fs, server only)
│   ├── kenyaPlaces.ts          # Local gazetteer suggestions (data/kenya-places.json)
│   ├── kenya.ts                # Counties, isInKenya polygon test, haversineKm, NAIROBI
│   ├── fitnessVenue.ts         # isFitnessVenue inclusion rule
│   ├── scoreGyms.ts            # scoreGym / applyFilters / rankGyms
│   ├── planner.ts              # Training + meal plan builders
│   ├── format.ts               # Display + safe-URL helpers
│   ├── storage.ts              # localStorage wrappers
│   ├── placesClient.ts         # Browser fetch wrappers for /api/places/*
│   ├── requestSafety.ts        # Rate limit, query/radius validation, fetchWithTimeout
│   ├── ttlCache.ts             # TTL cache, throttle, circuit breaker
│   ├── mapBounds.ts            # Kenya map maxBounds
│   ├── mapUpstream.ts          # Esri export URL resolution, image content-type check
│   ├── cover.ts                # Deterministic card gradient + index padding
│   └── *.test.ts               # Vitest specs (see Testing)
├── data/                       # Checked-in datasets (read at runtime / bundled)
│   ├── kenya-gyms.json         # Curated OSM gym catalog
│   ├── kenya-places.json       # GeoNames towns/neighbourhoods
│   └── kenya-boundary.json     # Simplified Kenya ADM0 polygon
├── scripts/                    # Node ESM maintenance scripts (not part of the app bundle)
│   ├── fetch-kenya-gyms.mjs    # Overpass -> data/kenya-gyms.json (--curate-existing offline)
│   ├── fetch-kenya-places.mjs  # GeoNames KE.zip -> data/kenya-places.json
│   └── make-icons.mjs          # Generates PNG icons into public/icons/
├── public/                     # Static assets served from /
│   ├── sw.js                   # Hand-written service worker (cache gym-finder-v3)
│   ├── icons/                  # PWA icons (icon.svg, icon-192/512.png, apple-touch-icon.png)
│   └── file.svg globe.svg next.svg vercel.svg window.svg  # create-next-app leftovers
├── .github/workflows/quality.yml   # CI: npm audit + npm run check
├── .planning/codebase/         # GSD codebase maps (this directory)
├── .claude/                    # GSD tooling (not part of the app)
├── AGENTS.md / CLAUDE.md       # Agent instructions (Next.js 16 docs warning)
├── README.md                   # Product + data + deployment notes
├── .env.example                # Optional provider env var names (no values required)
├── next.config.ts              # CSP + security headers, SW headers, turbopack root
├── tsconfig.json               # strict TS, alias "@/*" -> repo root
├── vitest.config.mts           # Vitest with "@" alias
├── eslint.config.mjs           # eslint-config-next core-web-vitals + typescript
├── postcss.config.mjs          # Tailwind v4 PostCSS plugin
└── package.json / package-lock.json
```

## Directory Purposes

**`app/`:**
- Purpose: routing surface only - one page, one manifest, six GET Route Handlers.
- Contains: `layout.tsx`, `page.tsx`, `manifest.ts`, `globals.css`, `api/**/route.ts`.
- Key files: `app/page.tsx`, `app/layout.tsx`, `app/api/places/nearby/route.ts`.

**`components/`:**
- Purpose: all UI. Every file begins with `"use client"`. Flat structure (no subfolders, no barrel/index file).
- Contains: one default-exported component per file.
- Key files: `components/GymFinderApp.tsx` (state owner), `components/MapView.tsx` (MapLibre).

**`lib/`:**
- Purpose: everything non-visual. Mixed server-only (`kenyaGymCatalog.ts`, `osmPlaces.ts`, `requestSafety.ts`, `ttlCache.ts`, `mapUpstream.ts`), client-safe (`scoreGyms.ts`, `planner.ts`, `format.ts`, `storage.ts`, `placesClient.ts`, `cover.ts`, `mapBounds.ts`, `types.ts`) and isomorphic (`kenya.ts`, `kenyaPlaces.ts`) modules in one flat folder - check the imports before using a module from client code.
- Contains: named-export functions, constants and types; specs sit next to the file under test.
- Key files: `lib/types.ts`, `lib/osmPlaces.ts`, `lib/scoreGyms.ts`.

**`data/`:**
- Purpose: static JSON datasets; refreshed only by scripts. Do not hand-edit.
- Contains: `kenya-gyms.json`, `kenya-places.json`, `kenya-boundary.json`.

**`scripts/`:**
- Purpose: developer-run data/asset generators (plain `.mjs`, Node built-ins only, no TypeScript).

**`public/`:**
- Purpose: static files; `sw.js` must stay at the root so its scope is `/`.

## Key File Locations

**Entry Points:**
- `app/page.tsx`: the only page (`/`).
- `app/layout.tsx`: root layout, fonts (`Bricolage_Grotesque`, `Figtree` via `next/font/google`), metadata.
- `app/api/places/nearby/route.ts`, `app/api/places/search/route.ts`, `app/api/places/details/route.ts`, `app/api/map/static/route.ts`: live endpoints.
- `public/sw.js`: service worker.

**Configuration:**
- `next.config.ts`: Content-Security-Policy and security headers; update `connect-src`/`img-src` here when adding an external origin.
- `tsconfig.json`: strict mode, `@/*` alias.
- `eslint.config.mjs`, `vitest.config.mts`, `postcss.config.mjs`.
- `.env.example`: documents optional vars `NOMINATIM_URL`, `OVERPASS_ENDPOINTS`, `OSM_USER_AGENT`, `ESRI_EXPORT_URL`, `TRUSTED_CLIENT_IP_HEADER`. Real `.env*` files are git-ignored (only `.env.example` is tracked).

**Core Logic:**
- `lib/osmPlaces.ts`: place search orchestration and OSM mapping.
- `lib/kenyaGymCatalog.ts`: catalog queries.
- `lib/scoreGyms.ts`: ranking.
- `lib/requestSafety.ts` and `lib/ttlCache.ts`: protection of upstreams and API.
- `lib/planner.ts`: training/meal plan content.
- `lib/storage.ts`: persisted client state and its localStorage keys (`gym-finder-*`).

**Testing:**
- `lib/*.test.ts`: `catalog`, `format`, `kenya`, `kenyaPlaces`, `mapRoute`, `osmPlaces`, `planner`, `requestSafety`, `scoreGyms`, `ttlCache`. No component tests and no e2e tests.

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` matching the default export (`components/GymCard.tsx`).
- Library modules: `camelCase.ts` named for the domain (`lib/scoreGyms.ts`, `lib/requestSafety.ts`).
- Tests: `<subject>.test.ts` beside the source in `lib/` (`lib/scoreGyms.test.ts`); exceptions named by area (`lib/catalog.test.ts`, `lib/mapRoute.test.ts` imports `app/api/map/static/route.ts`).
- Route Handlers: `app/api/<area>/<action>/route.ts` exporting `GET`.
- Scripts: `kebab-case.mjs` (`scripts/fetch-kenya-gyms.mjs`).
- Data: `kenya-<thing>.json` in kebab-case.

**Directories:**
- Lowercase single words (`components`, `lib`, `data`, `scripts`); API segments are lowercase nouns/verbs (`places/nearby`).

**Code:**
- Components are default exports; `lib/` modules use named exports. Types use `PascalCase` (`Gym`, `ClientProfile`); constants `UPPER_SNAKE_CASE` (`DEFAULT_FILTERS`, `RADIUS_OPTIONS`); functions `camelCase`.
- Imports use the `@/` alias for cross-folder paths (`@/lib/types`, `@/data/kenya-places.json`) and relative paths inside the same folder (`./kenya`, `./GymCard`).
- Gym ids are OSM refs: `node/123`, `way/123`, `relation/123` (validated in `app/api/places/details/route.ts`).

## Where to Add New Code

**New API endpoint:**
- Handler: `app/api/<area>/<action>/route.ts` exporting `GET` (match the pattern in `app/api/places/nearby/route.ts`: `rateLimit` first, validate, delegate to `lib/`, return `NextResponse.json` with `PLACE_CACHE_HEADERS` where cacheable).
- Logic: `lib/<domain>.ts`; wrap any upstream call with `fetchWithTimeout` + `withTtlCache` / `withProviderThrottle` / `withCircuitBreaker`.
- Tests: `lib/<domain>.test.ts` (route tests import the handler directly, see `lib/mapRoute.test.ts`).
- If the browser must call it, add a typed wrapper to `lib/placesClient.ts`.

**New UI panel / feature:**
- Component: `components/<Name>.tsx` with `"use client"` and a default export; wire it in `components/GymFinderApp.tsx` by extending `SheetMode` and `panelBody`.
- Pure logic: `lib/<name>.ts` + `lib/<name>.test.ts`; keep the component presentational.
- Styling: Tailwind utilities in JSX plus shared tokens/classes in `app/globals.css` (CSS variables on `:root`).

**New shared type or option list:**
- `lib/types.ts` (types, `DEFAULT_*`, `*_OPTIONS` constants).

**New persisted client state:**
- Add a `gym-finder-<name>` key and load/save pair in `lib/storage.ts` following `readJson` + try/catch; keep bump-suffix versioning (`-v1`) for shape changes.

**New dataset field or catalog source:**
- Change the generator in `scripts/fetch-kenya-gyms.mjs` (or `fetch-kenya-places.mjs`) and re-run the npm script; extend the `Gym` type in `lib/types.ts`; do not hand-edit `data/*.json`.

**Utilities:**
- Display/format helpers: `lib/format.ts`. Geometry/Kenya helpers: `lib/kenya.ts`. Request/abuse protection: `lib/requestSafety.ts`.

**New environment variable:**
- Read it in `lib/` (never in components), gate public-provider defaults on `NODE_ENV !== "production"`, document it in `.env.example` and `README.md`.

**New external origin used by the browser:**
- Update the CSP in `next.config.ts` and add a case to the service worker only if it must be cached (`public/sw.js` ignores cross-origin requests).

## Special Directories

**`.next/`:**
- Purpose: Next.js build output.
- Generated: Yes
- Committed: No (`.gitignore`)

**`node_modules/`:**
- Purpose: dependencies; also holds the Next.js 16 docs referenced by `AGENTS.md` (`node_modules/next/dist/docs/`).
- Generated: Yes (`npm ci`)
- Committed: No

**`data/`:**
- Purpose: runtime datasets, read via `fs` (`lib/kenyaGymCatalog.ts`) or bundled via JSON import (`lib/kenya.ts`, `lib/kenyaPlaces.ts`).
- Generated: Yes, by `scripts/`
- Committed: Yes (the app depends on them)

**`public/icons/`:**
- Purpose: PWA icons referenced by `app/layout.tsx`, `app/manifest.ts` and `public/sw.js`.
- Generated: Yes, by `scripts/make-icons.mjs`
- Committed: Yes

**`.planning/codebase/`:**
- Purpose: GSD-generated codebase documentation.
- Generated: Yes
- Committed: Per orchestrator

**`.claude/`:**
- Purpose: GSD agent/tooling install; not application code.
- Generated: Yes
- Committed: Per project policy

**`next-env.d.ts`:**
- Purpose: Next-generated type reference; git-ignored and regenerated by `next dev`/`next build`.

---

*Structure analysis: 2026-10-29*
