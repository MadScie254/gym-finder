# Find My Gym — progress ledger

Keep this current and under 150 lines. Resume from here and git log.

## Current — 2026-11-16

- React 19 + Vite 8 static site on Vercel. No backend, database, runtime API keys or Google Places. Location stays in the browser.
- The full revamp is built on the Signwriter UI kit (`src/ui/`): shell and nav (Home, Find gyms, Saved, My week), Home, discovery, gym profile, Saved, Compare, Reports, My week, and the Demo food stores.
- Discovery: `/search`, `/in/:place`, `/county/:county`, `/near/:landmark`. Typo-tolerant search, filters with counts held in the URL, list and map driven by the same selection, "Search this area", Load more, Back restores the scroll position.
- Live: https://gym-finder-sepia.vercel.app (Vercel production, public). The other `*.vercel.app` aliases sit behind Vercel Authentication.
- Search engines get real HTML for each shown gym (`/gym/<slug>/`), each county with a gym (`/county/<slug>/`) and each town or area with one (`/in/<place>/`), all in `sitemap.xml`. Canonical links use `SITE_URL` or Vercel's production domain. They used to point at `findmygym.ke`, which this project does not own.
- Gym profile follows the owner's order, with a sticky contact panel on wide screens. Hours, prices and amenities appear only when a source has them.
- Saved keeps notes, order and a "my gym" pick, with Undo, export, import and a share link. Compare is a side-by-side table with a tray in the shell. Reports go to WhatsApp or email from `VITE_SUPPORT_WHATSAPP` and `VITE_SUPPORT_EMAIL`; a link that is not configured is hidden, not dead.
- My week (`/plan`): week-by-week workout plan, 7-day meal plan, shopping list, `.ics` download, backup and restore, all in the browser.
- Food stores (`/fuel`) are a simulation. Every screen carries a Demo marker (a test enforces it), stores and prices are invented, nothing is ordered. Real Glovo or Foodplus links wait for a partnership decision.

## Catalogue (build of 2026-11-11)

- 566 records, 497 shown by default. Trust: 10 verified from each gym's own website, 139 corroborated, 348 listed, 69 unconfirmed (hidden by default).
- 92% of shown records have at least one contact route. 32 of 47 counties have a record; 15 have none. Nairobi 329, Kiambu 86, Mombasa 42.
- Overture release 2026-10-21.0. OSM snapshot 2026-09-17, marked stale. No claim that every Kenyan gym is listed.

## Checks (2026-11-16)

- `npm run check`: lint, types, contrast (34 pairs), 242 unit tests in 49 files, production build with 497 gym pages and 190 county and place pages prerendered. All pass.
- `npm run e2e`: 38 passed on mobile and desktop, 4 optional screenshot tests skipped. Journeys: search → profile, Save and Compare, production map readiness, My week, demo food flow, styleguide, axe on the real app.
- `npm run data:validate`: 566 venues, 66.7 KB gzipped catalogue.
- GitHub Actions does not run on this account (billing). Local checks and the Vercel build are the gate.

## Not done

- 15 counties have no record. Closing that needs a source, not invention.
- About 30 gyms list a website that no longer resolves; an override cannot clear a field yet.
- Human spot-check of the 10 verified profiles. Swahili copy needs a native reviewer.
- Lighthouse and offline checks have not been run on the production URL.
- `VITE_SUPPORT_EMAIL` is unset on purpose until the owner picks a role address.
- The old Cloudflare Workers copy still serves an older build. Retire it after the Vercel production URL is confirmed.

## Decisions and limits

- Vercel is the active host. The current personal, non-monetized app fits the Hobby plan; a commercial affiliate launch needs permitted hosting.
- Google Maps listings are not scraped or copied. Data comes from OSM, Overture and evidence from each gym's own site.
- Driving directions open an external map. An in-app road router must respect the location-on-device rule.
- Demo food stores and prices are samples; no real order or partnership is implied.
- `docs/REVAMP_PLAN.md` holds the larger roadmap. `docs/DECISIONS.md` holds dated decisions.
