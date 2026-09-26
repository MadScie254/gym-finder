# KAYA — Kenya Gym Finder

A keyless-first gym discovery PWA for Kenya. It combines a checked-in OpenStreetMap fitness catalog, a local GeoNames town/neighbourhood index, a MapLibre/OpenFreeMap map, and a device-local four-week training and seven-day Kenyan meal guide.

## Run locally

```bash
npm ci
npm run dev
```

Open http://localhost:3000. Run `npm run check` for lint, tests and a production build.

The app starts in Nairobi without requesting precise location. **Near me** asks browser permission and uses coordinates for that lookup only. The training brief, saved gyms and plan progress live in the visitor's browser storage, not a server account.

## Data and honest limitations

- `data/kenya-gyms.json` is a curated OpenStreetMap extract. `npm run fetch-gyms` refreshes it from Overpass; `npm run curate-gyms` re-applies the quality filter offline. The app also filters out non-fitness sports sites and points outside the Kenya boundary at read time. These are community-mapped listings, **not verified businesses**. Missing prices, ratings, hours or contact data are never invented.
- `data/kenya-places.json` is a filtered [GeoNames Kenya country dump](https://download.geonames.org/export/dump/KE.zip), refreshed with `npm run fetch-places`. It makes town and neighbourhood suggestions and submitted place searches work without a runtime API key. GeoNames is [CC BY 4.0](https://download.geonames.org/export/dump/readme.txt); attribution appears in the app.
- `data/kenya-boundary.json` is a simplified [geoBoundaries gbOpen Kenya ADM0](https://www.geoboundaries.org/api/current/gbOpen/KEN/ADM0/) polygon (RCMRD GeoPortal, public domain). It prevents a rectangular bounds check from admitting neighbouring countries.
- The map uses [OpenFreeMap](https://openfreemap.org/) without a token. Its community-operated service has no contractual uptime guarantee; the static Esri image is a best-effort fallback. Map locations are approximate and can be outdated.
- Local text search returns actual name/address matches, not random gyms near the last search point. A selected place searches a stated area around that place; a small radius is not silently enlarged. A nationwide search lists the currently mapped catalog only.
- The plan offers adjustable, conservative workouts and Kenyan-style meal ideas. It does not calculate calories, diagnose conditions, guarantee weight change, or replace a trainer or dietitian. Always check allergies and health restrictions.

Map and listing data © OpenStreetMap contributors. Place names © GeoNames, CC BY 4.0. OpenFreeMap and Esri attribution is retained in the map/fallback.

## Optional production services

The checked-in catalog and gazetteer work without runtime credentials. In development only, a public Overpass/Nominatim instance can supplement a submitted search. In production, configure **authorised** `OVERPASS_ENDPOINTS` and `NOMINATIM_URL` only if you operate or contract for a provider. Public Nominatim is never called for autocomplete. The default production behavior is local-first and does not depend on either service.

The in-process rate limiter and cache protect a single app instance; use a shared platform limiter/cache before high-traffic launch. The current app has no accounts, owner verification, lead delivery, payments, or real-time opening-hours guarantee. Those require business onboarding, a durable database, privacy review, and payment credentials. Do not advertise paid placement or "verified" listings until those systems and human checks exist.

The app does not use Google Places content on a non-Google map. A no-key Google Maps URL is used only to open external turn-by-turn directions.
