# Technology Stack

**Analysis Date:** 2026-10-29

## Languages

**Primary:**
- TypeScript 5.9.3 (`typescript@^5`, strict mode) - All application code: `app/`, `components/`, `lib/`, tests in `lib/*.test.ts`, config in `next.config.ts`
- TSX (React 19 JSX, `"jsx": "react-jsx"`) - UI components in `components/*.tsx` and `app/page.tsx`, `app/layout.tsx`

**Secondary:**
- JavaScript (ES modules, `.mjs`) - Data-refresh and asset scripts in `scripts/fetch-kenya-gyms.mjs`, `scripts/fetch-kenya-places.mjs`, `scripts/make-icons.mjs`; tool configs `eslint.config.mjs`, `postcss.config.mjs`
- JavaScript (classic script) - Service worker `public/sw.js` (served as-is, not bundled)
- CSS - Tailwind v4 entry in `app/globals.css`
- JSON - Checked-in datasets in `data/kenya-gyms.json`, `data/kenya-places.json`, `data/kenya-boundary.json`

## Runtime

**Environment:**
- Node.js - CI pins Node 24 (`.github/workflows/quality.yml`); local sandbox ran v22.22.0; Next.js 16.4.0 requires `>=20.9.0`. No `.nvmrc` or `engines` field in `package.json`.
- Browser runtime for client components (`"use client"`, MapLibre GL, `localStorage`, service worker)

**Package Manager:**
- npm (CI uses `npm ci` with `cache: npm`)
- Lockfile: present (`package-lock.json`)

## Frameworks

**Core:**
- Next.js 16.4.0 (`next@^16.4.0`) - App Router (`app/` directory), Route Handlers under `app/api/**/route.ts`, metadata routes (`app/manifest.ts`), `next/font/google`. Turbopack root set in `next.config.ts` (`turbopack: { root: process.cwd() }`). NOTE: `AGENTS.md` states this Next.js has breaking changes; consult `node_modules/next/dist/docs/` (run `npm ci` first; `node_modules` is absent in a fresh checkout) before writing Next-specific code. Uses the global `LayoutProps<"/">` type in `app/layout.tsx`.
- React 19.2.8 / React DOM 19.2.8 (pinned exactly, no caret)
- MapLibre GL JS 6.9.1 (`maplibre-gl@^6.9.1`) - Interactive map in `components/MapView.tsx`
- Tailwind CSS 4.3.3 (`tailwindcss@^4`, `@tailwindcss/postcss@^4`) - Styling via PostCSS plugin in `postcss.config.mjs`; styles in `app/globals.css`

**Testing:**
- Vitest 4.1.11 (`vitest@^4.1.11`) - Unit tests, config `vitest.config.mts` (only the `@` path alias; default Node environment). Run with `npm test` (`vitest run`).

**Build/Dev:**
- Next.js CLI (`next dev`, `next build`, `next start`)
- ESLint 9.39.5 (`eslint@^9`) with `eslint-config-next@^16.4.0` (`core-web-vitals` + `typescript` presets), flat config in `eslint.config.mjs`
- TypeScript compiler (`noEmit`, type check via Next build), config `tsconfig.json` (target ES2017, `moduleResolution: bundler`, alias `@/*` -> `./*`)

## Key Dependencies

**Critical:**
- `next` ^16.4.0 (locked 16.4.0) - App framework, API routes, headers/CSP, font loading
- `react` / `react-dom` 19.2.8 - UI rendering
- `maplibre-gl` ^6.9.1 - Vector map rendering against OpenFreeMap style (`https://tiles.openfreemap.org/styles/liberty`)

**Infrastructure:**
- No database, ORM, auth, HTTP-client, or state-management libraries. HTTP uses native `fetch` wrapped by `fetchWithTimeout` in `lib/requestSafety.ts`.
- Runtime dependencies are only 4 packages (see `package.json`); everything else is dev tooling (`@types/node` ^20, `@types/react` ^19, `@types/react-dom` ^19).
- In-house infrastructure helpers: in-process rate limiter (`lib/requestSafety.ts`), TTL cache / request coalescing / provider throttle / circuit breaker (`lib/ttlCache.ts`).
- Scripts use only Node built-ins (`node:zlib`, `node:fs`, `node:url`, `node:path`); no extra npm deps.

## Configuration

**Environment:**
- Keyless-first: the app runs without any env vars. All variables are optional and read via `process.env` in server code only.
- `.env.example` present (template, committed; contents not read). `.env*` is git-ignored except `.env.example` (`.gitignore`).
- Optional variables referenced in code (names only):
  - `OVERPASS_ENDPOINTS` (comma-separated https URLs) - `lib/osmPlaces.ts`
  - `NOMINATIM_URL` - `lib/osmPlaces.ts`
  - `OSM_USER_AGENT` - `lib/osmPlaces.ts`
  - `ESRI_EXPORT_URL` - `lib/mapUpstream.ts`
  - `TRUSTED_CLIENT_IP_HEADER` - `lib/requestSafety.ts`
  - `NODE_ENV` - switches dev defaults (public Overpass/Nominatim/Esri endpoints allowed only outside production)
- Behavior in production: upstream endpoints default to disabled/`null` unless configured; unidentified client IPs are rate-limited out (`lib/requestSafety.ts`).

**Build:**
- `next.config.ts` - `poweredByHeader: false`, Turbopack root, security headers on all routes (CSP with `connect-src`/`img-src`/`font-src` allowing `https://tiles.openfreemap.org`, `script-src` adds `'unsafe-eval'` only in dev, `X-Frame-Options: DENY`, `Permissions-Policy`, `Referrer-Policy`, `X-Content-Type-Options`), and `/sw.js` cache/scope headers.
- `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `vitest.config.mts`
- npm scripts (`package.json`): `dev`, `build`, `start`, `lint`, `test`, `check` (lint + test + build), `fetch-gyms`, `curate-gyms`, `fetch-places`
- Fonts: `Bricolage_Grotesque` and `Figtree` from `next/font/google` in `app/layout.tsx` (fetched/self-hosted by Next at build time)

**PWA:**
- Web manifest generated by `app/manifest.ts`; service worker `public/sw.js` (cache name `gym-finder-v3`, network-first runtime caching, capped at 120 entries) registered by `components/ServiceWorkerRegister.tsx` (skipped in development); icons in `public/icons/` generated by `scripts/make-icons.mjs`.

**Client persistence:**
- Browser `localStorage` only (`lib/storage.ts`, `components/Planner.tsx`); no server-side user state.

## Platform Requirements

**Development:**
- Node.js >= 20.9 (Node 24 matches CI), npm
- `npm ci && npm run dev` -> http://localhost:3000
- Quality gate: `npm run check` (ESLint, Vitest, `next build`)
- Network access to Overpass/Nominatim/Esri public endpoints only needed for dev-time supplementation and for the `fetch-*` data scripts

**Production:**
- Deployment target not declared in code. The repo has no `vercel.json`, Dockerfile, or deploy workflow; `.gitignore` includes `.vercel` and `lib/requestSafety.ts` comments reference "serverless isolates", implying a Vercel-style serverless host. Treat as undecided.
- Per-instance in-memory rate limiting and caching (`lib/requestSafety.ts`, `lib/ttlCache.ts`); README recommends a shared platform limiter/cache before high-traffic launch.

---

*Stack analysis: 2026-10-29*
