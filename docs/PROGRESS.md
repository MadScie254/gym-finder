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
- Desktop shell, phase 1 of 5 (pull request 12, merged on 2026-11-16 at the owner's request, after they had the preview screenshots). From 1100 px a glass sidebar (Explore, Plan, Help, 72 px rail from 1100 to 1279 px until you choose) and a top bar with a ⌘K quick-actions widget, language, appearance and location. From 900 px the header keeps the top navigation; below that, the bottom tabs. Both gain a Search button. The palette (Ctrl K or ⌘K, `src/features/palette/`) finds gyms and places, runs actions, opens pages and changes settings; on phones it is a full-height sheet. Glass is drawn only on wide screens with a fine pointer and over the contour texture, solid elsewhere. In sidebar mode the page scrolls in its own area under the top bar, so the glass is only ever over the page background; `src/app/usePageScroll.ts` makes scroll keys, Back and new pages behave as they do on a document page. While Kiswahili is on, a dashed Draft tag (Rasimu) sits beside the language button, since the menu that carried the draft note is not in this layout. An independent whole-branch review found no critical issue; its five important findings (keyboard scrolling, Back, forked theme state, the missing Swahili note, a contrast pair no check covered) are fixed. Also built: the `Accordion` and the Send button's hover text and plane (on touch the plane flies only while pressed, since a tap opens WhatsApp at once). Not yet used on screens: the Accordion and the redesigned Home, Find gyms and profile layouts (phases 2 to 4). Phase 5 is install polish and the new app icon, which the owner sees before it ships.

## Catalogue (build of 2026-11-11)

- 563 records, 495 shown by default. Trust: 10 verified from each gym's own website, 140 corroborated, 345 listed, 68 unconfirmed (hidden by default).
- 409 of 495 shown records (83%) have a phone, WhatsApp or website. 23 dead, parked or wrong-business website links are dropped (`data/overrides/dead-links.json`). 32 of 47 counties have a record; 15 have none. Nairobi 329, Kiambu 86, Mombasa 42.
- Overture release 2026-10-21.0. OSM snapshot 2026-09-17, marked stale. No claim that every Kenyan gym is listed.

## Checks (2026-11-16)

- `npm run check` on the phase 1 branch: lint, types, contrast (49 pairs, 15 of them for glass and texture, including the current sidebar page, the top bar widget and the selected palette row with their tints), 362 unit tests in 65 files, production build with 495 gym pages and 189 county and place pages prerendered. All pass.
- `npm run e2e` on the phase 1 branch: 54 passed on mobile and desktop, 16 skipped (screenshot tests and journeys that belong to the other project). New: `e2e/shell.spec.ts` covers the sidebar, the rail, the palette by keyboard and by widget, focus returning to the widget, an action typed in words, scroll keys after a click in the sidebar, Back restoring the scroll position, the appearance chosen in the palette showing on the top bar, the phone sheet, axe with the palette open, and Kiswahili rows that must not be cut off and the Draft tag. No older spec needed a change.
- Entry script grew from 140,087 to 144,789 bytes gzipped (4.6 KB, budget 10 KB); the palette is a separate 5 KB chunk, precached for offline.
- Lighthouse on the live site (mobile, simulated throttling, 2026-11-16): Home 97 performance, 96 accessibility, 100 best practices, 100 SEO. Find gyms 96, 100, 100, 100. Level 24 profile 100, 100, 100, 100. LCP 0.8 s on Home and profile, 2.3 s on Find gyms.
- Lighthouse on the phase 1 build served locally, measured the same way on `master` (2026-11-16): accessibility 96 to 100, best practices 100, SEO 100 on Home, Find gyms and a gym page, mobile and desktop. Home layout shift (CLS 0.24 on mobile) and the 1.4 to 1.7 s blocking time on desktop Find gyms (map start-up under headless software GL) are the same on `master`, not new. The Vercel preview itself scores SEO 54 and best practices 96 only because previews send `x-robots-tag: noindex` and answer `robots.txt` with a login page.
- Offline after one visit: the worker now precaches every built script, style and font (`scripts/precache.mjs`). Before, a first visit cached only the page, so an offline reload was blank. `e2e/offline.spec.ts` opens a never-visited gym page offline.
- `npm run data:validate`: 563 venues, 66.3 KB gzipped catalogue.
- GitHub Actions does not run on this account (billing). Local checks and the Vercel build are the gate.

## Not done

- 15 counties have no record. Closing that needs a source, not invention.
- Three checked websites are broken for now (two return HTTP 500, one is in maintenance mode) and stay listed until a recheck. Four more are up but show nothing dated. Only 40 websites have been opened; the other 174 listed ones are unchecked.
- Human spot-check of the 10 verified profiles. Swahili copy needs a native reviewer, the new shell and palette strings included.
- Known gaps in the phase 1 shell: the 72 px rail names a page on hover and to screen readers but shows no label on keyboard focus; after the palette hands over to Report and Report closes, focus lands on the page, not on where the person was (Report has never restored focus); the sidebar collapse button changes its label and also reports `aria-expanded`.
- Desktop shell phases 2 to 5 (page layouts, then install polish and the app icon). "Add a missing gym" is only in the palette and the phone menu until phase 2 puts it on Find gyms. A palette "Compare" action is left out until a later phase.
- Offline, the list and profiles work but map tiles are not cached, so the map has no background.
- Lighthouse flags one touch target on Home: a county link at the bottom of the first screen sits partly under the fixed bottom bar.
- `VITE_SUPPORT_EMAIL` is unset on purpose until the owner picks a role address.
- The old Cloudflare Workers copy still serves an older build. Retire it after the Vercel production URL is confirmed.

## Decisions and limits

- Vercel is the active host. The current personal, non-monetized app fits the Hobby plan; a commercial affiliate launch needs permitted hosting.
- Google Maps listings are not scraped or copied. Data comes from OSM, Overture and evidence from each gym's own site.
- Driving directions open an external map. An in-app road router must respect the location-on-device rule.
- Demo food stores and prices are samples; no real order or partnership is implied.
- `docs/REVAMP_PLAN.md` holds the larger roadmap. `docs/DECISIONS.md` holds dated decisions.
