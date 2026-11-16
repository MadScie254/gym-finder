# Find My Gym

A static gym finder for Kenya. React + Vite. No database and no runtime API keys. The map is MapLibre with OpenFreeMap tiles.

```bash
npm ci
npm run dev
```

Open http://localhost:5173. `npm run check` runs lint, types, colour contrast, unit tests and a production build. `npm run e2e` runs the Playwright journeys (mobile and desktop, with axe) against a production build.

## What is in the app

- Home, Find gyms (search, place, county and landmark pages), gym profile, Saved, Compare, Reports.
- My week (`/plan`): a workout and meal planner that keeps everything in the browser.
- Food stores (`/fuel`): a simulation. Every screen is marked Demo; stores, prices and orders are invented samples. Nothing is ordered and no real service is implied.

## Data

`public/data/` is the catalogue the app loads. The current build (11 Nov 2026) combines Overture Maps release 2026-10-21.0 with an OpenStreetMap snapshot from 17 Sep 2026, marked stale because Overpass timed out during the refresh. It has 563 sourced records and shows 495 by default: 10 Verified from each gym's own website, 140 corroborated by two sources, 345 listed from one source, and 68 unconfirmed (hidden by default). 32 of 47 counties have at least one record; 15 have none. 409 of the 495 shown records (83%) have a phone, WhatsApp or website. 23 website links that were found dead, parked or belonging to another business are dropped (`data/overrides/dead-links.json`). These numbers are not a claim of complete Kenya coverage or verified operation. `public/data/manifest.json` is the source of truth.

`npm run data:extract` then `npm run data:build` rebuilds from Overture and OSM. The Overture extractor can use DuckDB's Node API on Node 26. If all Overpass mirrors fail or return empty responses, the OSM extractor keeps the previous snapshot and marks it stale. `npm run data:validate` checks the generated catalogue before publication.

Addresses, hours, phones and prices are omitted when the source does not have them. The app does not invent ratings or a "Verified" label. Verified only comes from `data/overrides/venues/`.

## Map

The map shows the independently sourced catalogue with clustered gym pins. It is MapLibre only; the optional Google Maps pane was removed on 2026-11-11 (see `docs/DECISIONS.md`). Directions still open Google Maps as a plain link, which needs no key.

## Deploy

Vercel builds every push (`vercel.json` sends extensionless paths to `index.html`). The build also writes real HTML files for every shown gym (`/gym/<slug>/`), every county with a gym (`/county/<slug>/`) and every town or area with one (`/in/<place>/`), plus `sitemap.xml` and `robots.txt`. Canonical links use `SITE_URL` when set, otherwise Vercel's production domain. Optional build-time settings are listed in `.env.example`: `VITE_SUPPORT_WHATSAPP` and `VITE_SUPPORT_EMAIL` decide where reports and claims go. GitHub Actions is not the gate while the account is restricted; run `npm run check` and `npm run e2e` locally.

## Privacy

Location stays in the browser. There are no cookies and no analytics. By default, map tiles are requested from OpenFreeMap.

Map and listing data © OpenStreetMap contributors. See `LICENSE-DATA.md` and `NOTICE`.
