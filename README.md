# Find My Gym

A static gym finder for Kenya. React + Vite. No database. A Google Maps browser key is optional; the open map works without it.

```bash
npm ci
npm run dev
```

Open http://localhost:5173. `npm run check` runs lint, types, tests and a production build.

## Data

`public/data/` is the catalogue the app loads. The current build combines Overture Maps release 2026-10-21.0 with an older OpenStreetMap snapshot. It has 588 sourced candidates, of which 519 are shown by default. OpenStreetMap's Overpass service timed out during this refresh, so the previous 58 OSM records were retained and marked stale. These numbers are not a claim of complete Kenya coverage or verified operation.

`npm run data:extract` then `npm run data:build` rebuilds from Overture and OSM. The Overture extractor can use DuckDB's Node API on Node 26. If all Overpass mirrors fail or return empty responses, the OSM extractor keeps the previous snapshot and marks it stale. `npm run data:validate` checks the generated catalogue before publication.

Addresses, hours, phones and prices are omitted when the source does not have them. The app does not invent ratings or a "Verified" label. Verified only comes from `data/overrides/venues/`.

## Map

The default map shows the independently sourced catalogue with clustered gym pins. To use Google Maps JavaScript instead, create a billed Google Cloud project, enable Maps JavaScript API, create a production map ID, and set `VITE_GOOGLE_MAPS_API_KEY` and `VITE_GOOGLE_MAPS_MAP_ID` as Vite build variables (see `.env.example`). Restrict the browser key to your site domains and Maps JavaScript API. The app uses its own OSM/Overture records; it does not fetch or store Google Places listings. Review the current Google Maps Platform terms for a gym directory before enabling this option in production.

## Privacy

Location stays in the browser. There are no cookies and no analytics. By default, map tiles are requested from OpenFreeMap. When the optional Google map is enabled, the browser requests Google Maps content under Google's terms and privacy policy.

Map and listing data © OpenStreetMap contributors. See `LICENSE-DATA.md` and `NOTICE`.
