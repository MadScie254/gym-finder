# Find My Gym — progress ledger

Keep this current and under 150 lines. Resume from here and git log.

## Current — 2026-11-12

- Branch: `master`; React 19 + Vite 8 static site on Vercel.
- Phase 4 (Gyms rebuild) is underway. The Signwriter tokens and UI kit are in `src/ui/`.
- G4 gym detail rebuilt with the UI kit: source-backed hours, prices and facilities; distance, trust evidence, contact and share actions. Detail hides search filters.
- Explore results now use the Signwriter GymCard, distance block and action row. Save, Compare, Call and Chat stay functional.
- Fixed the production MapLibre worker bundle; the map now reaches its loaded state and draws tiles and gym clusters. Pin colours follow the trust palette.
- Catalogue: 566 OSM/Overture candidates, 497 default-visible, 10 website-checked profiles, 409 with contact. No claim that every Kenyan gym is listed.
- Overture release: 2026-10-21.0. OSM snapshot: 2026-09-17 and marked stale. Do not invent listings or listing details.
- No backend, database, runtime API keys or Google Places. Location stays in the browser.

## Checks

- `npm run check`: lint, types, contrast, 103 unit tests and production build pass after `npm ci`.
- `npm run data:validate`: passed (566 venues; 66.7 KB gzipped catalogue).
- `npm run e2e`: 14 passed on mobile and desktop, 4 optional screenshot tests skipped. Journeys cover gym search → detail, Save/Compare, contact and source sections, and production map readiness.
- GitHub Actions is unavailable on this account. Pushes to `master` use `[skip ci]`; local checks and the Vercel build are the gate.

## Next three

1. Move Explore filters and search onto the Signwriter UI kit; keep URL state and typo-tolerant search.
2. Make map and list respond to the same selected gym and visible area (G1), then verify on mobile and desktop.
3. Rebuild Compare and Saved (G5–G6), followed by Fuel's explicitly labelled demo flow.

## Decisions and limits

- Vercel is the active host. The current personal, non-monetized app fits the Hobby plan; a commercial affiliate launch needs permitted hosting.
- Google Maps listings are not scraped or copied. Data comes from OSM, Overture and evidence from each gym's own site.
- Driving directions currently open an external map. An in-app road router must respect the location-on-device rule.
- Fuel is a stub. Demo food stores and prices must be marked as samples; no real order or partnership is implied.
- Historic progress is in earlier revisions of this file. `docs/REVAMP_PLAN.md` holds the larger roadmap.
