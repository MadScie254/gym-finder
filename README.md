# Find My Gym

A static gym finder for Kenya. React + Vite. No database and no runtime API keys. The map is MapLibre with OpenFreeMap tiles.

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

The map shows the independently sourced catalogue with clustered gym pins. It is MapLibre only; the optional Google Maps pane was removed on 2026-11-11 (see `docs/DECISIONS.md`). Directions still open Google Maps as a plain link, which needs no key.

## Privacy

Location stays in the browser. There are no cookies and no analytics. By default, map tiles are requested from OpenFreeMap.

Map and listing data © OpenStreetMap contributors. See `LICENSE-DATA.md` and `NOTICE`.
