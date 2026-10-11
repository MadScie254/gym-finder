# Find My Gym

Static React + Vite app. No Next.js, no database, no runtime API keys.

```bash
npm ci
npm run dev
```

`npm run check` runs lint, types, tests and the production build.

Catalogue files live in `public/data/`. Rebuild with `npm run data:extract` (needs DuckDB) then `npm run data:build`. Until Overture is extracted, the committed catalogue is the OpenStreetMap snapshot only — say so; do not invent listings.

Location stays on the device. Do not add Google Places, ratings, prices or hours that are not in the source data.
