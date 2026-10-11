# Find My Gym

A static gym finder for Kenya. React + Vite. No database and no runtime API keys.

```bash
npm ci
npm run dev
```

Open http://localhost:5173. `npm run check` runs lint, types, tests and a production build.

## Data

`public/data/` is the catalogue the app loads. The current build is an OpenStreetMap snapshot (58 gyms) because the Overture extract needs DuckDB, which does not load on Node 26 for Windows in this environment. Do not treat that count as national coverage.

`npm run data:extract` then `npm run data:build` rebuilds from Overture and OSM when DuckDB is available. Validation requires at least 350 venues and 150 in Nairobi. Those gates fail on the OSM-only file. That is intentional.

Addresses, hours, phones and prices are omitted when the source does not have them. The app does not invent ratings or a "Verified" label. Verified only comes from `data/overrides/venues/`.

## Privacy

Location stays in the browser. There are no cookies and no analytics. Map tiles are requested from OpenFreeMap.

Map and listing data © OpenStreetMap contributors. See `LICENSE-DATA.md` and `NOTICE`.
