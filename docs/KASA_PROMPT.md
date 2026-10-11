# KASA — Build brief: KAYA, the Kenya gym finder (React rebuild)

> Paste this whole file to Kasa. It is self-contained. Supporting evidence, numbers and sources are in `docs/RESEARCH_FINDINGS.md` (read it only when a section below says "see research"). Written 2026-10-11 against Overture release `2026-09-23.1`.

---

## 0. How to work (read first, 2 minutes)

1. **The decisions in this file are final.** Do not re-research them. If you must deviate, write one line in `docs/DECISIONS.md` (what, why, evidence) and carry on.
2. **Keep a ledger, not a memory.** Create `docs/PROGRESS.md` (≤150 lines): current phase, last commit, next 3 steps, open questions, deviations. Update it at the end of every slice. If your context resets, this file plus `git log` is how you resume.
3. **Plan before code.** Spend your first step writing the slice plan for P0 into `docs/PROGRESS.md`; then execute.
4. **One slice = one commit.** A slice is a vertical, testable unit (e.g. "data pipeline emits `gyms.json` + passes gates"). Commit with a conventional message. Never force-push `main`. Tag the starting point first: `git tag legacy-next`.
5. **Token discipline** (section 13) is part of the job, not optional.
6. **Honesty is the product.** The app must never present a guess as a fact. If a rule in this file conflicts with making the UI look fuller, honesty wins.

---

## 1. Mission

Rebuild KAYA as a **React (Vite) single-page PWA, hosted as static files — no database, no application server, no API keys** — in which anyone in Kenya can:

1. **Find a real gym** — by name, area, landmark, county, or "near me" — and find it *even when they misspell it*;
2. **Know how much to trust the listing** — every venue shows where its data came from, how fresh it is, and a plain-language trust tier;
3. **Reach the gym in one tap** — call, WhatsApp, directions, website — to confirm hours and price before travelling;
4. **Fix what's wrong** — report a closure, suggest a missing gym, claim a listing — without us running a database;
5. Do all of that in a **corporate-grade, fast, accessible, offline-capable UI** that works on a mid-range Android phone on a slow connection.

**Not Next.js. React + Vite.** No Supabase/Firebase/D1/KV/SQL. No server-side code in production. The "database" is **JSON files in Git**, rebuilt monthly by a GitHub Action, plus human corrections as reviewable files in the same repo.

### Definition of done (measurable — report each in your final message)
| # | Target |
|---|---|
| D1 Coverage | ≥ 400 default-visible listings nationwide (baseline today: **58**). Report the real number, by county. |
| D2 Findability | A **golden set** (§5.11) of real gyms: 100% found by exact name, ≥ 95% by a 1-character typo, 100% by name + area, each ranked in the top 3. Enforced by a unit test. |
| D3 Actionability | ≥ 75% of default-visible listings have ≥ 1 contact action (phone / WhatsApp-able mobile / website). Report the real number. |
| D4 Honesty | No "Verified" without a human override; no invented ratings, prices, hours, photos; address is `null` (UI: "Address not listed") — never the string "Kenya". |
| D5 Zero server | Production build is static files only. `grep -R "api/places\|readFileSync\|process.env" src` returns nothing runtime-relevant. |
| D6 Speed (Lighthouse mobile, Slow 4G, emulated mid-range Android) | LCP ≤ 2.5 s · CLS ≤ 0.1 · INP "good" · initial JS ≤ 200 KB gzip (map chunk lazy-loaded) · data payload ≤ 150 KB gzip · scores ≥ 90 perf, ≥ 95 a11y / best-practices / SEO. |
| D7 Offline | After one online visit: search, list, detail, saved gyms and plan all work in airplane mode; a banner states the data date. Map tiles are best-effort. |
| D8 Quality | `npm run check` green; Playwright e2e (mobile + desktop) green; axe: 0 serious/critical on every screen; CI green. |

---

## 2. Ground truth: what the scan found (measured 2026-10-11)

- Repo `MadScie254/gym-finder`: Next.js 16.3.5 + React 19.2.8 + Tailwind 4 + MapLibre GL 6.9.1 + Vitest 4. `npm ci && npm run check` **passes**. ~3.6k lines of TS/TSX/scripts plus a 1,088-line stylesheet, 8 vitest files (all in `lib/`; `mapRoute.test.ts` and `requestSafety.test.ts` import Next and die with the server code), CI in `.github/workflows/quality.yml`.
- **It cannot be hosted statically today**: 6 API routes (`app/api/**`), in-process rate-limit/TTL cache, runtime Overpass/Nominatim calls, `readFileSync` of the catalog at request time.
- **The data is the real problem.** `data/kenya-gyms.json` = **58 gyms for all Kenya** (43 in the Nairobi area). Only 22 have a real address (36 say literally `"Kenya"`), 10 a phone, 8 a website, 10 hours, 0 a price. The headline reads "58 in Kenya"; the detail page for the closest gym shows address "Kenya" and a single Directions button.
- **A far better free source exists and is reachable with no key:** Overture Maps Places, release `2026-09-23.1`, holds **427 Kenyan fitness venues — 347 with a phone (81%), 182 with a website, 365 with an address.** The two sources barely overlap: with a strict name-aware match only **7 of the 58 OSM gyms** are also in Overture (9 with a looser rule), so **≈ 50 are OSM-only**. Merged ≈ **430 listings (~7×)** (379 Overture at confidence ≥ 0.5 + ≈ 50 OSM-only; projection, before dedupe tuning).
- **No open source is guaranteed accurate.** Overture's own guide: Places "is known to contain duplicates, a high junk rate, and low property completeness"; `confidence` "measures existence only" and is "independent of … `operating_status`". In Kenya `operating_status` is empty for **all** 427 gyms; source timestamps range from 2023-05 to 2026-09; junk exists at low confidence ("Alpha Supplements", a barber named "…Kinyozi and Fitness Centre", "Home_gym Equipments").
- Map code recreates **DOM markers on every `moveend`** (`components/MapView.tsx:149-178`) — will not scale; the combobox, sheet and service worker are hand-rolled; `Gym` type is Google-shaped with mostly-null fields (`lib/types.ts:32-52`).

**Reuse (port to the new app):** `lib/kenya.ts`, `lib/kenyaPlaces.ts` + `data/kenya-places.json` + `scripts/fetch-kenya-places.mjs`, `data/kenya-boundary.json`, `lib/planner.ts` (+ its test), `lib/storage.ts`, the URL-safety helpers in `lib/format.ts`, `public/icons/*`, the CI skeleton.
**Delete at cutover:** `app/**`, `next.config.ts`, `lib/osmPlaces.ts`, `lib/requestSafety.ts`, `lib/ttlCache.ts`, `lib/placesClient.ts`, `lib/kenyaGymCatalog.ts`, `eslint-config-next`, `next` — and rewrite `AGENTS.md`/`CLAUDE.md` (the current text is a Next.js warning that stops being true).

---

## 3. Hard constraints

1. **React + Vite + TypeScript (strict).** No Next.js, no Remix framework mode.
2. **No database, no BaaS, no application server, no serverless functions, no API keys at runtime.** Static files only. (Third-party *form/WhatsApp/email deep links* for reports are fine — they are links, not our database.)
3. **Free-tier hosting** (static host + free GitHub Actions). Nothing may need a paid plan to function.
4. **Never** use Google Places/Maps JS, scrape Google/Facebook/Instagram, buy/borrow proprietary listings, or invent ratings/reviews/prices/hours/photos.
5. **Licences are obligations** (§5.10): per-record provenance, in-app attribution, shipped notices.
6. **Kenya-first performance:** assume Android (≈ 92–95% of Kenyan mobile traffic), mid-range CPU, Slow 4G, expensive data, intermittent signal.
7. **Privacy:** location is used on-device only, never transmitted or stored remotely. No third-party trackers, no cookies. Analytics (if any) must be cookieless.
8. **Accessibility:** WCAG 2.2 AA minimum. Touch targets ≥ 44×44 px. Full keyboard operation. Respect `prefers-reduced-motion`, `prefers-color-scheme`, system font scaling to 200%.

---

## 4. Architecture (final)

### 4.1 Stack (pin exact versions after `npm view <pkg> version` at the start of P0; note them in `docs/DECISIONS.md`)
| Concern | Choice | Notes |
|---|---|---|
| Build | **Vite 8.x** + `@vitejs/plugin-react` | 8.1 was current in June 2026. |
| UI | **React 19.2.x**, TypeScript strict | |
| Routing | **React Router 7.x in library/data mode** | URL is the source of truth for search state. |
| Styling | **Tailwind 4** (already in repo) + CSS variables for tokens | Delete the 1,088-line global CSS; no CSS framework besides Tailwind. |
| Primitives | **Radix UI** (dialog, popover, tabs, toggle-group, tooltip), `lucide-react` icons, `vaul` (or a custom) bottom sheet | Own the components in `src/ui/`. |
| State | **Zustand** (UI state) + URL params (search/filter state) | No data-fetching library; data is one static file. |
| Map | **MapLibre GL JS** (repo has 6.9.1) — **GeoJSON source with `cluster: true`** + circle/symbol layers; **never DOM markers** | Lazy-load the map chunk after first paint. |
| Basemap | **OpenFreeMap** (`https://tiles.openfreemap.org/styles/liberty`, free, no key, no SLA) behind a `BASEMAP_STYLE_URL` constant | P3: optionally self-host PMTiles (measure Kenya extract first). |
| Search | **MiniSearch** (prefix + fuzzy + field boost) in a Web Worker if indexing > 50 ms; fall back to Fuse.js only if MiniSearch's measured gzip cost is unacceptable | |
| Hours | **`opening_hours` (opening_hours.js)** if still maintained (check `npm view opening_hours time`); else parse a documented subset and show the raw string for the rest | Timezone `Africa/Nairobi`. |
| PWA | **`vite-plugin-pwa`** if its peer range allows the Vite you pinned; otherwise a small hand-written SW with a build-time precache manifest | |
| Fonts | **Self-host** one variable family via Fontsource (recommended: Inter), Latin subset, `font-display: swap`, ≤ 60 KB total. No Google Fonts at runtime. | |
| Data build | **DuckDB** (extract) + **Node scripts** (merge/validate) + **Zod** (schema gates) | `pip install duckdb` was verified (1.5.6); or use `@duckdb/node-api`. |
| Tests | Vitest 4 + Testing Library; **Playwright** e2e; **@axe-core/playwright**; **Lighthouse CI** budgets | |
| Hosting | **Cloudflare** static hosting (Workers static assets or Pages — use whichever Cloudflare currently recommends for new static sites), `public/_headers` for CSP/security headers, SPA fallback | GitHub Pages is a fallback (cannot set headers). |

### 4.2 Repo layout
```
src/
  app/            router, providers, shell, error boundaries
  features/
    search/ results/ detail/ filters/ map/ compare/ commute/ saved/ plan/ report/ about/
  ui/             design-system components (Button, Chip, TrustBadge, Sheet, Skeleton, …)
  lib/            geo, format, hours, i18n, storage, search-index, url-state
  data/           loaders + types (no JSON blobs checked into src)
public/
  _headers  _redirects  manifest.webmanifest  icons/  data/ (generated, gitignored? see §5.7)
data/
  source/         raw snapshots (gitignored; large)
  overrides/      HUMAN-EDITED JSON (committed): venues/*.json, exclude.json, merge.json
  kenya-places.json  kenya-boundary.json  (existing)
scripts/data/     extract-overture.sql  extract-osm.mjs  build-gyms.mjs  validate.mjs  diff-report.mjs
scripts/          prerender.mjs  make-icons.mjs (existing)
e2e/              playwright specs
docs/             PROGRESS.md DECISIONS.md RUNBOOK.md KASA_PROMPT.md RESEARCH_FINDINGS.md
.github/workflows/ ci.yml  data-refresh.yml  deploy.yml
```

### 4.3 Data flow (no server anywhere)
```
 Overture (monthly, S3) ─┐                       ┌─> public/data/gyms.<hash>.json   (≈100 KB gz, ALL Kenya)
 OSM Overpass/Geofabrik ─┼─> build-gyms.mjs ─────┼─> public/data/manifest.json      (date, counts, releases, licences)
 GeoNames + boundary    ─┤   normalise·merge·    ├─> public/data/landmarks.json
 data/overrides/*.json  ─┘   tier·validate       └─> sitemap.xml + prerendered /gym/<slug>/ pages
                                   ▲ monthly GitHub Action opens a PR with a diff report; merge → deploy
 Browser: fetch gyms.json once → in-memory index (search, distance, filters) → service-worker cache → works offline
```

---

## 5. Data pipeline — the heart of "no guesswork"

### 5.1 Overture extract (verified query, September-2026 schema)
`categories` **no longer exists**; use `taxonomy` / `basic_category`. Read the release id from `https://stac.overturemaps.org/catalog.json` → `"latest"` (today `2026-09-23.1`). In Actions use `s3://` anonymously; **inside some sandboxes an egress proxy injects fake AWS keys — then list the bucket over HTTPS (`https://overturemaps-us-west-2.s3.amazonaws.com/?list-type=2&prefix=release/<REL>/theme=places/type=place/`) and pass the Parquet URLs to `read_parquet([...])`** (this worked; ~5 s for Kenya).
```sql
INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2'; SET threads=8;
COPY (
  SELECT id,
         names."primary"                              AS name,
         taxonomy."primary"                           AS tax,
         taxonomy.hierarchy                           AS hier,
         basic_category                               AS basic,
         confidence,
         addresses[1].freeform AS addr, addresses[1].locality AS locality,
         addresses[1].region AS region, addresses[1].country AS country,
         phones, websites, socials, emails,
         list_transform(sources, s -> s.dataset)      AS srcs,
         list_transform(sources, s -> s.license)      AS lics,
         list_transform(sources, s -> s.update_time)  AS upd,
         operating_status,
         bbox.xmin AS lng, bbox.ymin AS lat
  FROM read_parquet('s3://overturemaps-us-west-2/release/<REL>/theme=places/type=place/*', hive_partitioning=false)
  WHERE bbox.xmin BETWEEN 33.75 AND 41.91 AND bbox.ymin BETWEEN -4.9 AND 5.57
) TO 'data/source/overture-ke.parquet' (FORMAT parquet);
```
Then in Node/DuckDB keep only `country='KE'` **and** inside the Kenya polygon (`data/kenya-boundary.json`, `isInKenya`). The bounding box alone admits TZ/UG/ET/SS/SO records.

**Venue filter.** Include if `tax IN ('gym','yoga_studio','pilates_studio','martial_arts_club','boxing_class','gymnastics_center','boot_camp') OR basic IN ('gym','fitness_studio')` → **427** venues. Map to `kind`: gym · crossfit (name regex) · yoga · pilates · martial_arts · boxing · gymnastics · boot_camp. **Exclude from the default catalogue** (P3 may add an "Other sports venues" toggle): `sport_or_fitness_facility` (84), `swimming_pool` (52), `dance_studio` (27), `fitness_trainer` (19) — unless the name matches `\b(gym|fitness|crossfit|workout|bodybuilding)\b` **or** the record matches an OSM gym.
**Do not use `operating_status`** (empty for every Kenyan gym) — keep the field in the schema as `null`.
Keep **all** phones/websites/socials (arrays), not just the first.

### 5.2 OSM extract (extend `scripts/fetch-kenya-gyms.mjs`)
Keep the existing Overpass query and the Kenya-polygon gate, but also capture and carry: `opening_hours`, `fee`, `charge`, `phone`, `contact:phone`, `contact:whatsapp`, `website`, `contact:website`, `contact:instagram`, `contact:facebook`, `addr:*`, `brand`, `operator`, `wheelchair`, `shower`, `sauna`, `swimming_pool`, `female`/`gender`-style tags, `check_date`, `survey:date`, all `payment:*`, `description`, `level`. Add retries across Overpass mirrors (the sandbox could not reach `overpass-api.de`; Actions can) **or** switch to the Geofabrik Kenya `.osm.pbf` + an OSM filter tool if Overpass proves flaky. Never publish if the OSM step fails — reuse the previous OSM snapshot and mark `osmStale: true` in the manifest.

### 5.3 Normalise
- **Phones → E.164** (`+254…`) at **build time** using `libphonenumber-js` with default region `KE` (verify the package and use its `min`/`max` metadata appropriately; it must not ship to the browser). Don't hand-roll Kenyan numbering rules — Kenyan mobiles now span `07xx` **and** `01xx`. Keep numbers that validate; drop (and log) the rest. Classify `type` (mobile / fixed line) from the library. A number is a **WhatsApp guess** only if it is a mobile; label that action "Message on WhatsApp" (it opens `https://wa.me/<digits-without-plus>`); if OSM has `contact:whatsapp`, trust it.
- **Websites:** https-prefer, strip tracking params, canonicalise host; keep separately: `website` (own domain) vs `facebook` / `instagram` (social). Social URLs are never labelled "Website".
- **Names:** trim, collapse whitespace, fix ALL-CAPS / `Home_gym`-style underscores; keep the source name as `nameRaw`.
- **Address:** `null` when unknown. Never `"Kenya"`.
- **Area / town / county:** reverse-lookup coordinates against `data/kenya-places.json` (neighbourhood = nearest `suburb` within ~2 km, town = nearest `town`) and a county point-in-nearest-centroid test using `COUNTIES` in `lib/kenya.ts` (upgrade to polygons only if cheap). Overture's `locality` is a **county/town, not a neighbourhood**.

### 5.4 Merge / dedupe (OSM ∪ Overture)
Two records are the same venue if **any** hold: (a) same normalised phone; (b) same website host (excluding social hosts); (c) distance ≤ 150 m **and** normalised-name token similarity ≥ 0.5 (strip `gym fitness centre center club ltd limited the and & health studio`); (d) a forced pair in `data/overrides/merge.json`. **Never auto-merge on proximity alone.** My first overlap test used "≤ 60 m regardless of name" and produced false matches (OSM *Fahari Gym and Sports* ↔ Overture *Samnick Enterprises* at 21 m; *Racing Sport Gym* ↔ *Ultra Smart Controls* at 51 m; *Veteran Fitness Center* ↔ *Cool Gym Equipment* at 39 m). They may be the same premises under a different business name or different businesses — a human must decide. Write such proximity-only pairs (≤ 60 m, no name/phone/website agreement) to `data/source/review-candidates.json` and list them in the diff report; merge only via `data/overrides/merge.json`.
**Measured overlap with rule (c) strict (≤ 150 m and name-token Jaccard ≥ 0.5): 7 / 58** (AICAD gym↔AICAD Gymnasium · DOJO↔Dojo Wellness Club · Level 24↔Level 24 Gym and Fitness Centre · Physiq & Tone Gym↔Physiq & Tone Gyms · Rox Park Gym Diani True Fitness · The Colosseum Fitness Centre · The Fitness Cocoon); 9 / 58 with "≤ 300 m + any shared token". Use these 7 as **must-merge fixtures** and the three false-positive pairs above as **must-not-auto-merge fixtures**; log the match rate each run.
- **Location & name:** prefer OSM (surveyed by a mapper) when both exist; else Overture.
- **Contacts/hours:** union; record **per-field provenance** (`provenance: {phone: "overture-meta", hours: "osm"}`).
- **Stable IDs:** `osm:node/123` or `gers:<overture-id>`; first source wins, the others go in `aliases`. Slug = `slugify(name) + "-" + 4-char hash(id)`; keep old slugs in `aliases` and emit `_redirects` rules so shared links never break.
- Exclude via `data/overrides/exclude.json` (`{ "id": "...", "reason": "supplements shop" }`) plus a reviewed name deny-list starting from: `supplement|equipment|kinyozi|barber|salon|pharmacy|primary school|nursery`. **Review matches manually — "Academy" and "Club" can be legitimate.**

### 5.5 Trust tiers (the "no guesswork" mechanism)
Compute per merged venue; store `trust: { tier, score, reasons[], sources[], lastSeen, stale, verifiedAt }`.
| Tier | Rule | UI label |
|---|---|---|
| **verified** | A `data/overrides/venues/<slug>.json` with `verifiedAt` ≤ 12 months old (human phoned / visited / owner confirmed) | "Verified by KAYA · 14 Oct 2026" |
| **corroborated** | Matched in **both** OSM and Overture; **or** Overture `confidence` ≥ 0.85 **and** (phone or website) **and** updated ≤ 24 months ago | "Corroborated · 2 sources" |
| **listed** | One source; Overture `confidence` ≥ 0.5 (or an OSM gym with a name); updated ≤ 36 months ago | "Listed · call to confirm" |
| **unconfirmed** | Overture `confidence` < 0.5, **or** sparse + old | "Unconfirmed" — **hidden from default browse and map**, but **always returned by exact-name search**, clearly labelled |
- `lastSeen` = newest of source `update_time`s, OSM `check_date`/`survey:date`. `stale = lastSeen older than 24 months` → extra chip "May be outdated".
- `score` (0–100) is internal (sorting tie-breaks, tests). **Never show the number to users** — show the tier and the `reasons` ("Seen in OpenStreetMap and Meta business data · phone and website listed · updated Sep 2026").
- Baseline cut-offs measured on Overture: ≥ 0.5 → 379 venues (321 with phone), ≥ 0.7 → 228 (208), ≥ 0.8 → 161 (155).
- "Verified" can **only** come from an override file. Nothing else may produce that word anywhere in the UI, SEO text or JSON-LD.

### 5.6 Git-as-CMS for human corrections (this replaces the database)
- `data/overrides/venues/<slug>.json`: `{ "id": "...", "verifiedAt": "2026-10-20", "verification": "phone|visit|owner", "set": { "name"?, "phone"?, "whatsapp"?, "hours"?, "fee"?, "amenities"?, "address"?, "website"?, "instagram"?, "note"? }, "closed"?: true, "closedAt"?: "..." }`. Validated by Zod in CI. `closed: true` removes the venue from the catalogue and from sitemaps (and keeps a tombstone so a re-appearing source record doesn't resurrect it).
- Admin flow (document in `docs/RUNBOOK.md`): report arrives (WhatsApp/email, §F-23) → admin checks by phone/visit → edits/creates the override via GitHub web UI (or Pages CMS/Decap if you add it in P3) → PR → CI validates → merge → deploy in minutes.
- Corrections that belong upstream are pushed to OSM via the "Edit on OpenStreetMap" link, so the whole ecosystem improves.

### 5.7 Output files (all static)
- `public/data/gyms.<contenthash>.json` — **all Kenya**, one file, target ≤ 150 KB gzip, compact but readable keys. `unconfirmed` venues are **included but flagged**: excluded from default browse, map pins, sitemap and prerendered pages; returned only by exact-name search, labelled.
- `public/data/manifest.json` — `{ builtAt, overtureRelease, osmSnapshotAt, counts: {total, byTier, byCounty, byKind}, licenses: [...], notices: [...] }` — rendered on the "About our data" page.
- `public/data/landmarks.json` — malls (Overture `shopping_mall`, conf ≥ 0.6: **333**), universities (`college_university`), stadiums, bus stations — for "near Yaya Centre" style search; keep ≤ 60 KB gzip.
- Generated files are built in CI and deployed; commit only if you choose a "data in Git" release flow — decide once, document in `docs/DECISIONS.md`.

```ts
type TrustTier = "verified" | "corroborated" | "listed" | "unconfirmed";
type Venue = {
  id: string; slug: string; aliases: string[];
  name: string; kind: "gym"|"crossfit"|"yoga"|"pilates"|"martial_arts"|"boxing"|"gymnastics"|"boot_camp";
  lat: number; lng: number;
  area: string|null; town: string|null; county: string|null; address: string|null;
  phones: string[]; whatsapp: string|null; website: string|null; instagram: string|null; facebook: string|null;
  hours: { raw: string; source: "osm"|"override" } | null;   // never fabricated
  fee: "free" | null;                                          // only if tagged
  amenities: Partial<Record<"weights"|"classes"|"pool"|"sauna"|"showers"|"parking"|"wheelchair"|"women_only", true>>;
  trust: { tier: TrustTier; score: number; reasons: string[]; sources: string[]; lastSeen: string|null; stale: boolean; verifiedAt: string|null };
  provenance: Record<string, string>;
  osmUrl: string | null;
};
```
Drop every Google-era field (`rating`, `userRatingCount`, `priceLevel`, `photoName`, `googleMapsUri`, `reviews`).

### 5.8 Validation gates (build fails if any trips; implement in `validate.mjs`)
Zod schema passes · every venue inside the Kenya polygon · no two venues with identical id/slug · phones all E.164 `+254…` · URLs https/http only · address never `"Kenya"` · `total ≥ 350` and **not > 15% below the previous published build** · Nairobi ≥ 150 · every county in `COUNTIES` is present in the manifest (zero is allowed but must be listed) · golden-set test passes · payload size budget · licence notices present in the manifest.

### 5.9 Monthly refresh (`.github/workflows/data-refresh.yml`)
Cron monthly (Overture releases monthly; `workflow_dispatch` too) → install DuckDB → extract Overture (latest per STAC) → extract OSM → build → validate → `diff-report.mjs` (counts by tier, added/removed/renamed names, venues that lost a source) → open a **PR** with the report as the body (e.g. `peter-evans/create-pull-request` or `gh pr create`; verify). **A human skims the diff and merges** — that is the safety net against a bad upstream release. Deploy workflow builds and publishes on merge.

### 5.10 Licensing outputs (non-negotiable; **recommend counsel review before commercial launch**)
- Treat the merged venue dataset as an **ODbL derivative** (OSM attributes are mixed with non-OSM fields). Publish `public/data/` + `docs` notice: **ODbL 1.0**, attribution "© OpenStreetMap contributors" **and** the other sources. The other licences (CDLA-Permissive-2.0, Apache-2.0, CC0-1.0) appear compatible with publishing under ODbL — **confirm with a lawyer**, and also confirm the licence of `data/kenya-boundary.json` (README says public domain; geoBoundaries data is commonly CC BY).
- Ship `LICENSE-DATA.md` and `NOTICE` including the **Foursquare NOTICE** text (Apache-2.0, "transformed to the Overture schema") for any Foursquare-sourced record, the CDLA-Permissive-2.0 notice, and GeoNames CC BY 4.0.
- In-app: map attribution control stays visible (OpenFreeMap / OpenMapTiles / OSM); `/about/data` and `/legal` list every source, licence, release id and build date, generated from `manifest.json`. Every venue has a "Sources" disclosure.

### 5.11 Golden set (regression test for "I search a real gym, I find it")
`src/__tests__/golden.test.ts` loads the built `gyms.json` and asserts, for each golden gym: found by exact name; found with one character deleted/swapped; found as `"<name> <area>"`; found by name with ` gym`/`fitness` words dropped or reordered — **always in the top 3**.
Seed list — **present in source data; not independently verified as open today; the owner must confirm and extend to ≥ 25 (§15):**
*From Overture (high confidence, phone + website):* FirstPower CrossFit · Parklands Sports Club · Fitness Empire · Pent Hse Gymnasium (Penthouse Gym) · Alpha Fit · Hyat Fitness · Smart Gyms Junction · Salute Gym · Level 24 Gym and Fitness Centre · CrossFit Kwetu · Ultra Fitness Gym · Just Train Gym and Aerobics (Kiambu).
*OSM-only (not found in Overture under the strict rule — these prove the merge keeps OSM's contribution):* EA Fitness · Climb Blue Sky · Fahari Gym and Sports · Veteran Fitness Center · Racing Sport Gym · Rudicci Fitness Lots · Fitness Mania Gym Parklands · Nyali CrossFit Gym · Muscle Beach Gym Kasarani · Kenyatta University Gymnasium.
*Must resolve to exactly ONE merged record (appear in both sources):* Level 24 · The Colosseum Fitness Centre · DOJO / Dojo Wellness Club · AICAD gym / AICAD Gymnasium · Physiq & Tone Gym(s) · Rox Park Gym Diani True Fitness · The Fitness Cocoon. Assert the search returns one result, not two.
Also add a `known-closed.json` of gyms the owner says are closed and assert they never appear.

---

## 6. Features (phased; IDs are for your ledger and commits)

**Priority cut-line (use if budget runs short): MUST = F-00…F-17, F-22, F-23, F-26, F-27 · SHOULD = F-20, F-21, F-24, F-25 · COULD = F-30…F-36.**

### P0 — Truth & foundations
- **F-00 Scaffold & cutover.** `git tag legacy-next`; Vite + React + TS + Tailwind 4 + Router + Vitest + ESLint; port reusable libs with their tests; strict TS; path alias; CI (`lint`, `test`, `build`, `audit --omit=dev --audit-level=high`); remove Next + server code at cutover; rewrite `AGENTS.md`/`CLAUDE.md` for the new stack. *Accept:* `npm run check` green; `dist/` is static; no `next` in `package.json`.
- **F-01 Data pipeline** per §5, incl. gates, diff report, monthly Action, licence outputs. *Accept:* §5.8 gates green; D1/D3 numbers reported; `docs/RUNBOOK.md` explains monthly refresh + override editing.
- **F-02 Client data layer.** Load `manifest.json` + `gyms.<hash>.json` once (`<link rel="preload">`), build the search index, geo utils (haversine, bbox, point-to-segment), `useVenues()` hooks, version check against manifest. *Accept:* unit tests; index build time reported.
- **F-03 Golden-set & data-quality tests** (§5.11) wired into CI.

### P1 — The core promise (find it, trust it, reach it)
- **F-10 App shell & URL state.** Routes: `/` · `/search?q=&kind=&open=&tier=` · `/gym/:slug` · `/in/:place` (county/town/area) · `/near/:landmark` · `/saved` · `/plan` · `/compare?ids=` · `/about/data` · `/legal` · `*`. Back/forward and shared links restore the exact view. Error boundary + 404 + offline banner.
- **F-11 Search.** One combobox with grouped results: **Gyms · Areas · Landmarks · Counties**. Typo-tolerant and prefix-aware (`kilimni` → Kilimani; `lvl 24` → Level 24), diacritic-insensitive, synonyms (`gym`/`gymnasium`/`fitness`/`crossfit`), phone-number search, recent searches (local), keyboard (↑↓ Enter Esc, `/` to focus), ARIA 1.2 combobox, instant (< 50 ms on mid-range Android). Exact-name queries also surface `unconfirmed` venues, labelled. *Accept:* golden set passes.
- **F-12 Results ↔ map as one control.** List and map share selection; hover/selection highlights both; **live "in view" filtering** when the map moves (no manual "Search this area" button needed — show a subtle "Showing N in this area"); clustering via a GeoJSON source; selected venue pin enlarges with its name; nearest-first when a location is known else best-match; virtualise the list if > 200 rows. *Accept:* 60 fps pan on a throttled CPU in Playwright trace; no DOM markers.
- **F-13 Venue detail ("Is it real? Where? Can I reach them now?").** Header with name · kind · area/county · distance + "~N min walk (straight-line estimate)"; **TrustBadge** with a "Why you can trust this / what we don't know" popover (sources, `lastSeen`, stale flag); **ActionBar**: Call · WhatsApp ("Message on WhatsApp", with a **prefilled** message: "Hi, is <name> open today and what is the day-pass price? Found you on KAYA.") · Directions (Google Maps URL + `geo:` fallback) · Website · Instagram · Share; hours (parsed + raw); amenities only if tagged; "Address not listed" when null; **"Is something wrong?"** (F-23). *Accept:* a listing with only a name+location still renders a useful card (Directions + "No contact listed — report or suggest").
- **F-14 Filters.** Chips: Type (gym/CrossFit/yoga/pilates/martial arts/boxing…) · Open now (known hours only) · Has phone · Verified/Corroborated only · Women-only (only if tagged) · Amenities (only tagged) · Distance. Each filter shows result counts; "No results" suggests the nearest result and the widest filter to relax.
- **F-15 Location.** "Near me" via `navigator.geolocation` (on-device, never sent anywhere), **manual pin drag** and "Set home / work" anchors saved locally. Graceful denial. Out-of-Kenya location → explain, stay in Nairobi.
- **F-16 PWA & offline.** Installable (manifest, maskable icons), SW precaches shell + manifest + gyms.json, stale-while-revalidate for data by content hash, bounded tile cache for the last-viewed area, "Update available" toast, offline banner with data date. iOS install hint retained.
- **F-17 i18n EN/SW.** Lightweight dictionary (no heavy i18n lib), language toggle, `lang` attribute, SW strings reviewed by a native speaker (§15). Dates/numbers formatted for `en-KE`/`sw-KE`.

### P2 — Differentiators ("game changers", all no-DB)
- **F-20 Commute search — "gym on my way".** Pick two anchors (home, work/landmark); rank venues by distance to the **segment** between them and to either end ("2 min detour" is *not* claimed — say "≈ N km from your route, straight-line"). Pure geometry; no routing API.
- **F-21 Compare (≤ 3).** Side-by-side: distance, trust tier & sources, hours, contacts, amenities, fee-if-known; shareable `/compare?ids=`.
- **F-22 Honest open-now engine.** Parse OSM hours; show "Open now · closes 21:00" / "Closed · opens 05:00" / "Hours not listed — call". Filters: open now, 24/7, opens before 06:00, open after 21:00. Never infer hours.
- **F-23 Report · Suggest · Claim (no database).** Buttons open **prefilled** WhatsApp (`https://wa.me/<SUPPORT_NUMBER>?text=…`) or `mailto:` messages containing venue id + issue type (closed / wrong phone / wrong location / not a gym / add missing gym / claim as owner). Plus **"Edit on OpenStreetMap"** (`https://www.openstreetmap.org/edit?node=<id>` / `way=` / `relation=`; for non-OSM venues, the iD editor centred on the coordinates: `https://www.openstreetmap.org/edit#map=19/<lat>/<lng>`). Support number/email from a build-time env constant. Admin flow = §5.6.
- **F-24 Saved gyms.** Local list with private notes, reorder, export/import JSON backup, share as a link of ids. Snapshot-on-save so saved gyms survive a data refresh (re-resolve by id/aliases).
- **F-25 Planner v2.** Keep `lib/planner.ts` content (and its safety copy). Add: pick a saved gym as "my gym", **download an `.ics`** of the 4-week schedule generated client-side (with reminders), progress persisted locally, print-friendly view. No health claims beyond current copy.
- **F-26 "How KAYA knows" (`/about/data`) and `/legal`.** Auto-generated from `manifest.json`: build date, Overture release, venue counts by tier/county/kind, methodology (what each tier means), known gaps, how to correct a listing, licences and notices. This page is a trust asset — design it like a status page.
- **F-27 Shareable, indexable pages.** `scripts/prerender.mjs` runs after `vite build` and writes `dist/gym/<slug>/index.html`, `/in/<place>/`, `/county/<slug>/` from the SPA shell with unique `<title>`, description, canonical, Open Graph/Twitter tags, **JSON-LD** (`ExerciseGym` with `name`, `address` (only if known), `geo`, `telephone`, `url`, `sameAs` → OSM URL; `openingHoursSpecification` only when parsed; **no `aggregateRating`, no fake reviews**; mark up only what's visible), plus a visible static fallback summary and `<noscript>` list. Also `sitemap.xml`, `robots.txt`, `_redirects` for old slugs. Per-gym "Share" uses the Web Share API with a WhatsApp deep-link fallback. *Accept:* `view-source` of a gym URL shows its name, area and JSON-LD; Lighthouse SEO ≥ 95.

### P3 — Scale & polish (COULD)
- **F-30 Self-hosted basemap option.** Measure a Kenya `pmtiles extract --bbox 33.75,-4.9,41.91,5.57 --maxzoom 14` first; if sensible, host on object storage (CORS + range requests) behind `BASEMAP_STYLE_URL`; keep OpenFreeMap as fallback.
- **F-31 Website liveness signal.** In the monthly job, probe each venue's own website (concurrency ≤ 5, 10 s timeout, polite UA, skip social hosts, retry once). Record `websiteStatus` and **treat a persistently dead site as a weak negative signal** (extra "website unreachable" reason / tier cap), never as proof of closure.
- **F-32 Performance pass & budgets in CI** (Lighthouse CI, bundle-size gate, data-size gate).
- **F-33 Cookieless analytics** (e.g. Cloudflare Web Analytics or Plausible) with ≤ 6 events: search, open venue, call, WhatsApp, directions, report. No PII.
- **F-34 Admin ergonomics.** Optional Git-based CMS UI (Pages CMS/Decap) for `data/overrides/`, or a small `npm run override:new -- <slug>` generator.
- **F-35 Edge & error states** everywhere (empty, offline, geolocation denied, slow network, stale data, corrupted local storage).
- **F-36 Accessibility audit** with a screen-reader pass (TalkBack on Android is the primary target).

### P4 — Launch
Domain + HTTPS + `_headers` (CSP below) · robots/sitemap submitted · uptime check · analytics on · `docs/RUNBOOK.md` (monthly data refresh, override editing, rollback) · README rewritten (honest limitations kept) · legal pages final · launch checklist ticked in `docs/PROGRESS.md`.

---

## 7. UI/UX design system — "KAYA Trust UI" (corporate, calm, trustworthy)

**Principles.** (1) *Trust is visible* — the tier badge is part of every card. (2) *Map and list are one control.* (3) *Every screen answers: Is it real? Where is it? Can I reach them now?* (4) *Quiet confidence* — neutral surfaces, one brand accent, generous spacing, zero decoration that carries no information. (5) *Honest empties* — say what we don't know.

### 7.1 Tokens (CSS variables; Tailwind `@theme`). Contrast ratios below were **computed**, all ≥ 4.5:1.
| Token | Light | Dark |
|---|---|---|
| `--bg` (paper) | `#FAFAF7` | `#0E1411` |
| `--surface` | `#FFFFFF` | `#151C18` |
| `--ink` (text) | `#0E1411` (17.8:1) | `#F2F4F1` (16.9:1) |
| `--muted` | `#566159` (6.2:1) | `#9AA59E` (7.3:1) |
| `--brand` (logo, active pin, focus ring) | `#C82F0B` (5.2:1 on paper; white on it 5.4:1) | `#FF6A45` (6.6:1 on `--bg`, 6.1:1 on `--surface`) |
| `--action` (primary buttons) | `#0E1411` with white text (18.6:1) | `#F2F4F1` with ink text |
| `--tier-verified` | `#0A7A4B` (5.2:1; on tint `#E6F4EC` 4.8:1) | `#4CC38A` (8.4:1) |
| `--tier-corroborated` | `#1F5FBF` (5.8:1; tint `#E8F0FC` 5.3:1) | `#7FA8F0` (7.8:1) |
| `--tier-listed` | `#5B6560` (5.8:1) | `#9AA59E` |
| `--tier-unconfirmed` | `#8F5200` (5.95:1; tint `#FFF3DB` 5.7:1) | `#E0A23B` (8.3:1) |
Never convey tier by colour alone: each tier has an **icon + text label**. Radii 8/12/16; elevation: 1 subtle shadow + 1 sheet shadow; spacing scale 4-px base; focus ring 3 px `--brand`, offset 2 px.

### 7.2 Type
One variable sans (recommend Inter), self-hosted. Scale (rem): 12 · 14 · 16 (body) · 18 · 22 · 28 · 36. Weights 400/500/600/700. **Tabular numerals** for distances, phone numbers, hours. Min body 16 px on mobile. No all-caps eyebrow spam; one small caps label style max.

### 7.3 Layout
- **Mobile (< 768):** top = search field (56 px) + horizontally scrollable filter chips; map under it; **bottom sheet with 3 snap points** (peek 96 px / half / full) containing the list or detail; a **List ⇄ Map** toggle; floating "locate me" 44 px; bottom nav (Explore · Saved · Plan · More) 56 px; honour safe-area insets; the list renders **before** the map loads, and the app is fully usable if the map never loads.
- **Desktop (≥ 1024):** left rail 400 px (search, chips, list or detail as a push-in panel — never a modal), map fills the rest; keyboard: `/` focus search, `j`/`k` move through results, `Enter` open, `Esc` back, `c` compare.
- **Tablet:** 360 px list + map.

### 7.4 Components
SearchBar (grouped combobox) · FilterChips · **ResultCard** (name 2-line clamp · kind chip · "Kilimani · Nairobi" · "1.2 km · ~15 min walk" · open-state chip · TrustBadge · 44-px Call/WhatsApp icon buttons · save) · **TrustBadge** + popover · **ActionBar** · VenueSheet · CompareTray · SavedList · AnchorPicker · Skeletons (never spinners alone) · Toast · Banner (offline / stale / update) · EmptyState variants · DataStatus widget ("Data updated 5 Oct 2026 · 421 gyms").
- Pin design: clustered circles with counts; single pins coloured by tier with a distinct shape per tier (not colour-only); selected = larger + label.
- Motion: 150–200 ms ease-out for sheet/panel; no parallax; all motion disabled under `prefers-reduced-motion`.

### 7.5 Copy rules
Plain Kenyan English, active voice, no hype. Use **"Listed"** not "Verified" unless an override exists. Required microcopy examples: *"Hours not listed — call to confirm."* · *"Address not listed."* · *"Seen in OpenStreetMap and Meta business data. Updated Sep 2026."* · *"No gyms within 5 km of Kitengela. Nearest: <name>, 9 km."* · *"Offline — showing data from 5 Oct 2026."* Swahili equivalents via F-17.

### 7.6 Screens to design & build (mobile + desktop each)
Explore (map+list) · Search (typing, results, empty) · Venue detail (rich, minimal-data, unconfirmed) · Filters · Compare · Commute · Saved · Plan · About data · Legal · Offline/Error/404 · Install prompt · First-run (one screen: "Find a real gym in Kenya" + location choice; **no mandatory onboarding form**, goals move into Plan).

---

## 8. Security headers (public/_headers) — test in a real browser, fix console CSP errors
Start from the existing CSP and tighten: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'` (remove `unsafe-inline` if Tailwind output allows); `connect-src 'self' https://tiles.openfreemap.org`; `img-src 'self' data: blob: https://tiles.openfreemap.org`; `font-src 'self'` (+ `https://tiles.openfreemap.org` for map glyphs); `worker-src 'self' blob:`. Plus `Permissions-Policy` (geolocation=(self); camera/microphone/payment off), `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`. Long-cache hashed assets; `no-cache` for `index.html`, `sw.js`, `manifest.json`.
Sanitise every external string (names, URLs) — React escapes text, but never use `dangerouslySetInnerHTML`; validate URLs with the existing `safeExternalUrl`/`safeTelephoneUrl` (now also `https://wa.me/` builder).

---

## 9. Performance & offline budgets
Initial JS ≤ 200 KB gzip (route-split; **map + MiniSearch worker lazy**) · fonts ≤ 60 KB · `gyms.json` ≤ 150 KB gzip · `landmarks.json` ≤ 60 KB gzip · no layout shift from late fonts/data · list first-paint from cached data ≤ 1 s on repeat visits · tile cache ≤ 20 MB · measure with Lighthouse CI and Playwright traces on **4× CPU throttle + Slow 4G**; fail CI on regression.

---

## 10. Privacy & compliance
Location stays on the device (state this in the UI at the moment of the permission prompt). No cookies, no third-party scripts except the map tile requests. Privacy page in plain language (Kenya's Data Protection Act 2019 — owner to confirm with counsel whether registration as a data controller is required; do not claim compliance you haven't confirmed). Reports sent via WhatsApp/email are the reporter's own message — say so. Data licensing per §5.10.

---

## 11. Testing & QA gates
- **Unit:** geo (haversine, point-to-segment), phone/URL normalisers, trust-tier function (table-driven), merge rules (fixtures), hours parser, search ranking, i18n completeness (every EN key has an SW key), planner (existing).
- **Data:** §5.8 gates + golden set + known-closed.
- **Component:** TrustBadge states, ResultCard variants (full data / minimal / unconfirmed), ActionBar link builders.
- **E2E (Playwright, mobile 390×844 and desktop 1440×900):** search a golden gym with a typo → open detail → Call/WhatsApp hrefs correct; filter → URL updates → reload restores; save → offline (context.setOffline) → still listed; install-prompt path; report links prefilled; keyboard-only run through search → detail.
- **A11y:** axe on every route, zero serious/critical; manual focus-order check.
- **Perf:** Lighthouse CI against budgets.
- **Visual:** at most **2 screenshots per UI iteration** (one mobile, one desktop). Do not screenshot to "check if it worked" — assert in tests.
- **CI:** `lint · typecheck · test · build · e2e · lighthouse · audit(high)`; the data-refresh workflow must be dry-runnable (`workflow_dispatch`) before first merge.

---

## 12. Anti-goals (do not do)
Next.js · any DB/BaaS · server/serverless code · Google Places/Maps JS · scraping · fake ratings/reviews/prices/hours/photos · stock gym photos implying a specific gym · paid "featured/verified" placement · numeric trust scores shown to users · `any` types · components > 250 lines · secrets in the repo · `npm audit fix --force` · skipping/disabling tests to get green · adding features not in this file without a `DECISIONS.md` line.

---

## 13. Token & context discipline (how to spend your budget)

**Budget by phase (share of your total working budget; estimates):** P0 20% · P1 30% · P2 25% · P3 10% · P4 10% · reserve 5%. If > 60% is spent before P2 starts, drop COULD items first (F-30, F-33, F-34), then SHOULD; **never cut MUST** and never cut tests.

**Rules**
1. **Read once, distil.** Read this file once; write the ≤150-line `docs/PROGRESS.md` ledger; thereafter re-read the ledger, not this file. Open `docs/RESEARCH_FINDINGS.md` only for the section you need.
2. **Never load datasets into context.** Don't `cat` `data/*.json` or Parquet. Query: `jq '.gyms | length'`, `jq '.gyms[:3]'`, DuckDB `SELECT … LIMIT 5`, `head -c 1500`. Generated JSON is built by scripts and **never pasted into chat or into source files**.
3. **Targeted tests while iterating** (`vitest run <file>`); the full `npm run check` once per slice and before each commit. Pipe noisy output through `tail -40`.
4. **Small files, small diffs.** Keep components < 250 lines; prefer edits over whole-file rewrites; don't re-read a file you just wrote.
5. **Generate, don't hand-write, repetitive things** (icons, i18n completeness check, sitemap, redirects, JSON-LD, route stubs).
6. **No exploratory wandering.** The repo map is in §2/§4.2. Use `Grep`/`Glob` with a specific pattern; don't list `node_modules` or lockfiles.
7. **Parallelise only disjoint work** (if you can spawn helpers): (A) data pipeline (`scripts/data`, `data/overrides`), (B) design system (`src/ui`), (C) CI/tests (`e2e`, `.github`). Give each an explicit file-ownership list; merge via git, not by sharing context.
8. **Verify, don't speculate**: when a package/version/behaviour matters, run `npm view …` or a 10-line spike; record the result in `DECISIONS.md` in one line.
9. **Browser checks:** Playwright (Chromium may already be installed — don't download browsers); one script, reused. Headless WebGL can fall back to a static map in restricted sandboxes (software GL flags: `--use-angle=swiftshader --enable-unsafe-swiftshader`); test map logic with unit tests and don't burn tokens fighting the sandbox.
10. **Commit protocol:** conventional messages (`feat(data): …`, `feat(ui): …`, `test: …`, `chore(ci): …`); update `PROGRESS.md` in the same commit; push the branch; open a **draft PR** early and keep it current.

**Skills / capabilities to use (if your environment provides them; otherwise do it by hand as written)**
- *Planning / task tracking* — keep a task list synced with `PROGRESS.md`.
- *Frontend-design / UI skill* — load once at the start of P1; apply §7 (don't re-derive a style).
- *Browser/Playwright skill or tool* — for the e2e suite and the capped screenshots.
- *Code-review / simplify passes* — run once at the end of P1 and P2 over the diff, not per file.
- *Security review* — once at P4 over `_headers`, URL builders and the service worker.
- *Documentation skill* — for `RUNBOOK.md`.
- *DuckDB, jq, Lighthouse CI, axe* — as tools in scripts/CI.

**Stop and ask the owner (batched, once per phase)** only for: a licence/legal doubt, accounts or spend (domain, Cloudflare, WhatsApp number), the golden-set list, brand changes, or a data result that contradicts this file (e.g. catalogue < 350 after merge).

---

## 14. Execution order (follow it)
1. `git tag legacy-next` → create branch → write `docs/PROGRESS.md` + `docs/DECISIONS.md` (with pinned versions).
2. **P0:** F-00 scaffold (keep Next alive until the new shell renders `/`) → F-01 pipeline (**the single most valuable slice — ship it first and report D1/D3**) → F-02 data layer → F-03 golden tests → delete Next/server code → CI green → draft PR.
3. **P1:** F-10 → F-11 → F-12 → F-13 → F-14 → F-15 → F-16 → F-17.
4. **P2:** F-22 → F-23 → F-26 → F-27 (MUST) → F-20 → F-21 → F-24 → F-25.
5. **P3** per budget; **P4** launch checklist.
6. After each phase: run the e2e + a11y + Lighthouse gates, update `PROGRESS.md`, push.

---

## 15. Questions for the owner (ask once, early, batched)
1. **Golden list:** 25+ gyms you *personally know are real and open* (name + area), plus any known **closed** gyms.
2. **Support channel:** WhatsApp number and/or email for reports/claims; who verifies listings and how often.
3. **Hosting & domain:** Cloudflare account/domain ready? (Kasa should not buy anything.)
4. **Brand:** OK to keep the name KAYA and vermilion `#C82F0B` as the accent with the neutral, corporate palette in §7.1?
5. **Swahili:** who reviews the translations?
6. **Legal:** can counsel review §5.10 (ODbL/CDLA/Apache/CC mix, boundary-file licence) and the Data Protection Act question before launch?
7. **Analytics:** Cloudflare Web Analytics, Plausible, or none?
8. **Scope of "venues":** gyms and studios only (default), or also pools / sports facilities in a later toggle?

---

## 16. Final report format (your last message of each phase)
1. What shipped (bullets) · 2. D1–D8 table with **measured** values · 3. Deviations (links to `DECISIONS.md`) · 4. Known gaps/risks · 5. What I need from the owner · 6. Next phase plan (≤ 5 bullets). Never claim "verified", "tested" or "complete" for anything you did not run.
