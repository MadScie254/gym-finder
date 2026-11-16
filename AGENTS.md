# Find My Gym

Static React + Vite app. No Next.js, no database, no runtime API keys.

```bash
npm ci
npm run dev
```

`npm run check` runs lint, types, tests and the production build.

Catalogue files live in `public/data/`. Rebuild with `npm run data:extract` (needs DuckDB) then `npm run data:build`. The committed catalogue combines the Overture release and the OpenStreetMap snapshot named in `public/data/manifest.json`; say which, and do not invent listings.

Location stays on the device. Do not add Google Places, ratings, prices or hours that are not in the source data.

The photographs in `public/photos` are free stock illustrations (see `docs/PHOTO_CREDITS.md` and `scripts/photos/README.md`). Never present one as a picture of a listed gym or store.
