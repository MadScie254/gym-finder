# KAYA — Research findings (2026-10-11)

Evidence behind `docs/KASA_PROMPT.md`. Everything marked **measured** was run against the real repo or the real Overture release on 2026-10-11. Everything marked **unverified** is stated as such and must be re-checked before it is relied on.

---

## 1. The one-paragraph answer

KAYA today lists **58 gyms for the whole of Kenya** because its only source is OpenStreetMap (OSM), and Kenyan gyms are thinly mapped there. Overture Maps — a free, no-key, monthly-refreshed open places dataset whose Kenyan gym records come almost entirely from Meta's business pages — holds **427 fitness venues in Kenya**, 81% with a phone number. Only 7 of KAYA's 58 OSM gyms (9 with a looser rule) also appear in Overture, so the two sources are **complementary, not redundant**: merged, they give roughly **430 default-visible listings (~7× today)**. No open dataset is complete or guaranteed current (Overture itself says Places "is known to contain duplicates, a high junk rate, and low property completeness"), so "no guesswork" has to be delivered by **showing provenance and trust honestly, making every listing one tap from the gym itself, and giving people a way to correct the data** — all achievable with static files and no database.

---

## 2. Project scan (measured)

### What exists
| Area | Finding |
|---|---|
| Stack | Next.js 16.3.5 (App Router) · React 19.2.8 · Tailwind 4 · MapLibre GL 6.9.1 · Vitest 4. `npm run check` (lint + tests + build) **passes** on a clean `npm ci`. |
| Server code | 6 API routes under `app/api/**`, an in-process rate limiter + TTL cache (`lib/requestSafety.ts`, `lib/ttlCache.ts`), runtime Overpass/Nominatim calls (`lib/osmPlaces.ts`), and `readFileSync` of `data/kenya-gyms.json` at request time (`lib/kenyaGymCatalog.ts:12-24`). The app therefore needs a running Node server — it cannot be hosted as static files today. |
| Data | `data/kenya-gyms.json` (58 venues), `data/kenya-places.json` (GeoNames towns/suburbs, ~119 KB), `data/kenya-boundary.json` (Kenya polygon, ~35 KB). |
| Client | One 508-line orchestrator (`components/GymFinderApp.tsx`), a hand-rolled combobox, a hand-rolled bottom sheet, a 1,088-line `app/globals.css`, a hand-written service worker (`public/sw.js`) that precaches by regex-scraping `/_next/static/` URLs. |
| Map | `components/MapView.tsx:149-178` destroys and recreates DOM `Marker`s on every `moveend` — will not scale to hundreds of pins and is poor for accessibility. OpenFreeMap style with a static-image fallback served by an API route. |
| Planner | `lib/planner.ts` + `components/Planner.tsx`: 4-week training plan and 7-day Kenyan meal plan, device-local, with safety copy. Worth keeping. |
| Tests | 8 vitest files (all in `lib/`; `mapRoute.test.ts` and `requestSafety.test.ts` import Next server types). No component or end-to-end tests. |
| Legacy | `lib/types.ts:32-52` — `Gym` is shaped like a Google Places object (`priceLevel: "PRICE_LEVEL_FREE"`, `photoName`, `googleMapsUri`, `rating`, `userRatingCount`, `reviews`); most fields are always null/empty for OSM data. |

### What the live UI shows (screenshots taken against `next start`)
- Headline: **"58 in Kenya"** — the thinness of the data is the first thing a user reads.
- Detail page for the *closest* gym ("Fahari Gym and Sports"): address shows just **"Kenya"**, no phone, no hours, no website; the only action is "Directions". A user who searches for a real gym gets nothing they can act on.
- 36 of 58 listings have address = `"Kenya"`; only 10 have a phone, 8 a website, 10 any hours, 0 any price (measured).
- Non-gym venues are mixed in with no type indicator ("Rekebisha primary/Gym", "Climb Blue Sky" climbing wall, a supplements store named "Rollin Total Fitness-Health…").
- Caveat: in my headless sandbox the live WebGL map fell back to the static image and the fallback tile request did not render, so I could **not** judge live-map rendering. I make no claim about it.

### Reuse vs replace
**Keep / port:** `lib/kenya.ts` (boundary test, counties, haversine), `lib/kenyaPlaces.ts` + `data/kenya-places.json` + `scripts/fetch-kenya-places.mjs`, `data/kenya-boundary.json`, `lib/planner.ts` (+ test), `lib/storage.ts`, `lib/format.ts` helpers `safeExternalUrl`/`safeTelephoneUrl`, icons, CI skeleton.
**Replace:** everything under `app/` (Next), all API routes, `lib/osmPlaces.ts`, `lib/requestSafety.ts`, `lib/ttlCache.ts`, `lib/placesClient.ts`, `lib/kenyaGymCatalog.ts`, the Google-shaped `Gym` type, scoring that assumes ratings, the UI layer and CSS.

---

## 3. Data-accuracy experiment (measured)

**Method.** Listed the public Overture bucket, read the latest release (`2026-09-23.1`, from `https://stac.overturemaps.org/catalog.json` → `"latest"`) with DuckDB 1.5.6 over HTTPS (16 Parquet files, ≈11 GB; the Kenya bounding-box filter prunes row groups and finished in ~5 s), kept `addresses[1].country = 'KE'`, and measured fitness venues. Compared against `data/kenya-gyms.json`.

| Metric | KAYA today (OSM only) | Overture 2026-09-23.1, Kenya |
|---|---|---|
| Fitness venues (gyms, studios, martial arts, boxing, yoga, pilates, gymnastics, boot camp) | **58** | **427** (367 gym · 23 martial arts · 13 yoga · 9 boot camp · 5 boxing · 5 gymnastics · 5 pilates) |
| With phone | 10 (17%) | 347 (81%) |
| With website | 8 (14%) | 182 (43%) |
| With a real address string | 22 (38%) | 365 (85%) |
| With a social page | — | 420 (98%) |
| With opening hours | 10 | not in the schema we pulled |
| Source mix | 100% OSM | 417 Meta · 5 Microsoft · 4 Foursquare · 1 AllThePlaces |
| Record update times | catalog built 2026-09-17 | 2023-05 … 2026-09 (so freshness varies per record) |
| Probable duplicates (same normalised name ≤300 m) | n/a | 0 of 427 |
| `operating_status` populated | n/a | **0 of 427** (cannot be used to detect closures) |

**Overlap (corrected after a first, too-loose test):** my first test matched on "≤ 400 m + a shared name token, **or ≤ 60 m regardless of name**" and reported 18/58 — but the ≤ 60 m clause produced false matches (OSM *Fahari Gym and Sports* ↔ Overture *Samnick Enterprises* at 21 m; *Racing Sport Gym* ↔ *Ultra Smart Controls* at 51 m; *Veteran Fitness Center* ↔ *Cool Gym Equipment* at 39 m). Re-run with name-aware rules:

| Rule | OSM gyms also in Overture | OSM-only |
|---|---|---|
| ≤ 150 m **and** name-token Jaccard ≥ 0.5 (strict) | **7 / 58** | **51** |
| ≤ 300 m and any shared name token | 9 / 58 | 49 |
| identical normalised name (≤ 2 km) | 4 / 58 | 54 |

Strict matches: AICAD gym, DOJO (↔ *Dojo Wellness Club*), Level 24 (↔ *Level 24 Gym and Fitness Centre*), Physiq & Tone Gym, Rox Park Gym Diani True Fitness, The Colosseum Fitness Centre, The Fitness Cocoon. OSM-only examples: *EA Fitness, Kenyatta University Gymnasium, Nyali CrossFit Gym, Muscle Beach Gym Kasarani, Climb Blue Sky, Fahari Gym and Sports, Veteran Fitness Center, Racing Sport Gym, Rudicci Fitness Lots, Fitness Mania Gym Parklands*. Conversely ~420 Overture gyms are not in OSM. Neither source alone is adequate — and the same-premises-different-name pairs above need human review, never auto-merge.

**Confidence filter (Overture `confidence`, existence-likelihood 0–1):**
| Cut-off | Venues kept | …of which with phone |
|---|---|---|
| ≥ 0.3 | 416 | 338 |
| ≥ 0.5 | **379** | 321 |
| ≥ 0.7 | 228 | 208 |
| ≥ 0.8 | 161 | 155 |

Low-confidence examples are mostly not gyms ("Home_gym Equipments", "Steppin Razors Kinyozi and Fitness Centre" — a barber, "Alpha Supplements"), confirming that a confidence threshold plus a name deny-list is necessary. Mid-confidence (0.5–0.6) records are mostly plausible small gyms.

**Geography (core venues, Overture `locality`):** Nairobi 250 · Mombasa 33 · Kiambu 32 · Nakuru 14 · Kajiado 12 · Kisumu 8 · Machakos 7 · Uasin Gishu 7 · Nyeri 6 · Kwale 5 · … 40 distinct localities. `locality` is a county/town, **not** a neighbourhood — "Kilimani" must be derived by reverse-looking-up coordinates against the GeoNames gazetteer already in the repo.

**Landmarks available for "near X" search (Overture, Kenya):** 491 `shopping_mall` records (333 with confidence ≥ 0.6), 1,281 `college_university`, 182 `bus_station`, 97 `stadium_arena`.

**Projected merged catalogue:** ≈ 379 (Overture ≥ 0.5) + ≈ 50 OSM-only ≈ **430 default-visible listings** (some OSM-only entries, e.g. a primary-school gym, will be filtered out), plus ≈ 48 low-confidence Overture ones that stay searchable by exact name but labelled "Unconfirmed". This is a projection; dedupe tuning will move it.

### Schema change you must know about
The September 2026 Overture release **removed `categories`**; use `taxonomy.primary`, `taxonomy.hierarchy`, `taxonomy.alternates` and `basic_category` (Overture Places guide). Code written from older tutorials fails with "Referenced table categories not found". The query that works is in the prompt.

---

## 4. Source landscape and verdict

| Source | Verdict | Why |
|---|---|---|
| **OpenStreetMap** (Overpass / Geofabrik) | **Use** (already in repo) | Surveyed positions, `opening_hours`, `fee`, `check_date`; community can fix errors; ODbL. Thin coverage in Kenya (58). |
| **Overture Maps Places** | **Use — primary breadth source** | No key, free, monthly releases, per-record `sources`/`license`/`update_time`/`confidence`; 427 Kenyan fitness venues. Licences per source: CDLA-Permissive-2.0 (Meta, Microsoft, PinMeTo, Krick, RenderSEO, DAC, BrightQuery), Apache-2.0 (Foursquare), CC0-1.0 (AllThePlaces). |
| **Foursquare OS Places** (direct) | **Skip** | Already folded into Overture (only 4 Kenyan fitness records survive there); direct access needs a contact-sharing agreement / portal. Apache-2.0. |
| **Google Places API (New)** | **Do not use (for now)** | Needs an API key + billing; per-SKU free caps are small (third-party summary: Text Search/Nearby 5,000 free events/month then ≈ $32 per 1,000 — **unverified**, check the official price list); display-on-non-Google-map and caching terms **not verified** by me — read the Maps Platform terms before ever considering it. Also contradicts "no server/no key/no database". |
| **Scraping Google / Facebook / Instagram** | **Never** | Terms violations; not defensible for a "corporate" product. |
| **Owner claims & user reports** | **Use — via Git, not a database** | `data/overrides/*.json` is the human-verified layer; the only thing allowed to earn the "Verified" badge. |

**Honest ceiling:** informal one-room gyms that exist only on Instagram/WhatsApp will still be missing. The design answers this with (a) "Suggest a gym" and "Edit on OpenStreetMap" flows that feed the next monthly rebuild, and (b) an owner-supplied "golden list" of real gyms used as a regression test.

---

## 5. Licensing analysis (not legal advice — get counsel before commercial launch)

- Overture's Places guide: the theme "contains no OpenStreetMap data"; "Joining CDLA Permissive 2.0 data to OpenStreetMap is permitted"; the resulting data **may need to carry the ODbL if it is a derivative database**.
- OSMF Community Guidelines: a database where OSM and non-OSM data are *independent* is a "Collective Database"; adding non-OSM attributes onto OSM records (or vice-versa) produces a **Derivative Database** → ODbL share-alike. Maps and visualisations are Produced Works (credit OSM).
- Overture attribution page: no blanket text-attribution requirement; some sources require their own notices — the only notice it spells out for Places is the **Foursquare NOTICE.txt** (Apache-2.0; "Foursquare data was transformed to the Overture schema").
- **Recommended conservative approach (in the prompt):** treat the merged venue dataset as an ODbL derivative; publish it under ODbL with `NOTICE`/`LICENSE-DATA.md`; keep per-field provenance; show OSM / Overture / Foursquare / GeoNames / OpenFreeMap attribution in-app and on a `/legal` page. The permissive licences (CDLA-Permissive-2.0, Apache-2.0, CC0) appear compatible with publishing under ODbL, but **a lawyer should confirm** — including the licence of `data/kenya-boundary.json` (the README calls it public domain; geoBoundaries data is commonly CC BY — **unverified**, confirm).

---

## 6. Stack evaluation

| Decision | Choice | Evidence / status |
|---|---|---|
| Build tool | **Vite 8.x** + `@vitejs/plugin-react` 6.x | Vite 8 announced 2026-03-12, 8.1 on 2026-06-23 (vite.dev blog). Rolldown-based; "most existing plugins work out of the box". **Verify with `npm view`** before pinning. |
| Router | **React Router 7.x, library/data mode** | Official docs confirm framework-mode static pre-rendering (`ssr:false` + `prerender`) exists but the root route is still server-rendered at build and must be SSR-safe; I could not confirm framework-mode ↔ Vite 8 compatibility, so the prompt uses library mode + a ~60-line post-build prerender script (fewer moving parts, same SEO result). |
| PWA | `vite-plugin-pwa` **if** its peer range allows Vite 8, else a small hand-rolled SW with a build-time precache list | Peer-dependency status for Vite 8 **unverified** (search found only "requires Vite 5+" for v0.17+). |
| Map | **MapLibre GL JS** (repo already on 6.9.1) with a **GeoJSON source + `cluster: true`** and symbol layers instead of DOM markers | Native clustering avoids an extra dependency and scales to thousands of points. |
| Basemap | **OpenFreeMap** now (free, no key, no limits on views/requests per its homepage; community-run, no contractual SLA); **Protomaps PMTiles on object storage** as a later resilience step | Kenya-extract size **unmeasured** — measure with `pmtiles extract --bbox` before committing. Cloudflare Pages assets: 25 MiB per file and 20,000 files per site on Free (changelog 2026-01-23; the 25 MiB figure is from a third-party summary) → large PMTiles belong in R2, not in the site bundle. |
| Search | **MiniSearch** (prefix + fuzzy + field boosts); fall back to Fuse.js if measured size is unacceptable | Search comparisons found were thin; the prompt requires measuring. |
| Opening hours | **`opening_hours.js`** | Described by the OSM wiki as the most complete implementation of the OSM `opening_hours` spec; one index showed the last release ~4 years old — **verify it is maintainable** or limit to a documented subset and show raw text otherwise. |
| Hosting | **Static** on Cloudflare (Workers static assets or Pages — use whichever Cloudflare currently recommends for new static sites) via `public/_headers` + `_redirects`; GitHub Pages is a fallback but cannot set response headers | Pages Free: 20,000 files/site; static-asset bandwidth reported as unlimited by third parties (**unverified**). |
| State | Zustand + URL query params | Small, no server cache layer needed because data is a static file. |
| UI primitives | Tailwind 4 (already) + Radix primitives + `vaul` bottom sheet (or custom) + `lucide-react` | Standard, accessible; verify each version. |

### Alternatives rejected
- **Next.js static export** — owner said React, not Next; still drags `next` tooling and `AGENTS.md` caveats.
- **Supabase / Firebase / Cloudflare D1 or KV** — they are databases; the owner explicitly does not want one, and Git-as-CMS covers the only write path (human corrections) at this scale.
- **Runtime Overpass/Nominatim calls from the browser** — public instances are community-run with usage policies; unreliable at launch traffic; unnecessary because the whole dataset is ~100 KB gzipped.
- **Routing/isochrone APIs** — public demo servers are not for production; use straight-line "on my way" geometry, clearly labelled approximate.

---

## 7. Kenya context
- Mobile is overwhelmingly Android: StatCounter's Kenya mobile OS share in 2026 shows Android ≈ 92–95% (monthly figures vary across StatCounter pages: 92.4% in June/July, 92.94% in Aug, 95.16% in Sept). → budget for mid/low-end Android, small payloads, offline.
- Official languages are English and Swahili → ship both for core UI (needs native-speaker review).
- **Kenya Data Protection Act 2019** (ODPC): the app keeps location on-device and stores nothing server-side, which minimises obligations, but the owner should have counsel confirm whether the operating entity must register as a data controller (vendor sources disagree on the threshold — **unverified**).

---

## 8. What I could not verify (do not treat as fact)
1. Whether Overture's Meta-sourced gym records are currently open — confidence measures **existence only** and `operating_status` is empty for every Kenyan gym record.
2. That any specific gym named in the prompt is real and open today (they are present in source data, nothing more).
3. Vite 8 compatibility of `vite-plugin-pwa` and React Router framework mode.
4. Maintenance status of `opening_hours` on npm.
5. Kenya-extract size of a Protomaps basemap.
6. Google Places caching/display terms and exact current pricing.
7. Licence of `data/kenya-boundary.json`.
8. Registration threshold under the Kenyan Data Protection (Registration) Regulations.
9. Live rendering of the WebGL map (sandbox limitation).
10. Mobbin reference screens (plan-gated; not used). UI direction is based on established map/list patterns, not a Mobbin audit.

---

## 9. Reproduce the measurements

```python
# pip install duckdb   (verified: duckdb 1.5.6)
import duckdb, re, urllib.request
rel = "2026-09-23.1"   # or read "latest" from https://stac.overturemaps.org/catalog.json
base = "https://overturemaps-us-west-2.s3.amazonaws.com"
xml  = urllib.request.urlopen(f"{base}/?list-type=2&prefix=release/{rel}/theme=places/type=place/").read().decode()
urls = [f"{base}/{k}" for k in re.findall(r"<Key>([^<]+)</Key>", xml)]
con = duckdb.connect(); con.execute("INSTALL httpfs; LOAD httpfs; SET threads=8;")
con.execute(f"""
COPY (
  SELECT id, names."primary" AS name, taxonomy."primary" AS tax, taxonomy.hierarchy AS hier,
         basic_category AS basic, confidence, addresses[1].freeform AS addr,
         addresses[1].locality AS locality, addresses[1].country AS country,
         phones[1] AS phone, websites[1] AS website, socials[1] AS social, emails[1] AS email,
         list_transform(sources, s -> s.dataset) AS srcs, list_transform(sources, s -> s.license) AS lics,
         list_transform(sources, s -> s.update_time) AS upd, operating_status,
         bbox.xmin AS lng, bbox.ymin AS lat
  FROM read_parquet({urls!r})
  WHERE bbox.xmin BETWEEN 33.75 AND 41.91 AND bbox.ymin BETWEEN -4.9 AND 5.57
) TO 'ke_places.parquet' (FORMAT parquet)""")
```
Why HTTPS and not `s3://`: inside the Claude sandbox the egress proxy injects dummy AWS credentials, which makes anonymous `s3://` reads fail with `InvalidAccessKeyId`. In GitHub Actions or on a normal machine `s3://overturemaps-us-west-2/release/<REL>/theme=places/type=place/*` with `SET s3_region='us-west-2'` works anonymously.

---

## 10. Sources
- Overture — Places guide: https://docs.overturemaps.org/guides/places
- Overture — Attribution and licensing: https://docs.overturemaps.org/attribution
- Overture — STAC catalog (latest release): https://stac.overturemaps.org/catalog.json
- OSMF — Community Guidelines (Collective vs Derivative Database): https://osmfoundation.org/wiki/Community_Guidelines · https://wiki.openstreetmap.org/wiki/Open_Data_License/Community_Guidelines · https://wiki.openstreetmap.org/wiki/License/Use_Cases
- Foursquare OS Places: https://docs.foursquare.com/data-products/docs/fsq-places-open-source
- Vite 8: https://vite.dev/blog/announcing-vite8.html
- React Router pre-rendering / SPA mode: https://reactrouter.com/7.18.3/how-to/pre-rendering
- OpenFreeMap: https://openfreemap.org
- Protomaps / PMTiles: https://protomaps.com/blog/serverless-maps-now-open-source
- Cloudflare Pages file-limit changelog: https://developers.cloudflare.com/changelog/post/2026-01-23-pages-file-limit-increase/
- opening_hours (npm): https://npmjs.com/package/opening_hours · OSM wiki: https://wiki.openstreetmap.org/wiki/FOSSGIS/Server/Projects/opening_hours.js
- Kenya Data Protection Act 2019: https://www.odpc.go.ke/wp-content/uploads/2024/02/TheDataProtectionAct__No24of2019.pdf
- StatCounter Kenya mobile OS share: https://gs.statcounter.com/os-market-share/mobile/kenya
- Google Maps Platform pricing: https://developers.google.com/maps/billing-and-pricing/pricing
