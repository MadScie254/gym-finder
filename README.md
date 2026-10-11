# KAYA — Kenya Gym Finder

A keyless-first gym discovery PWA for Kenya. It combines a checked-in OpenStreetMap fitness catalog, a local GeoNames town/neighbourhood index, a MapLibre/OpenFreeMap map, and a device-local four-week training and seven-day Kenyan meal guide.

## Run locally

```bash
npm ci
npm run dev
```

Open http://localhost:3000. Run `npm run check` for lint, tests and a production build.

The app starts in Nairobi without requesting precise location. **Near me** and **Directions** ask browser permission only after being tapped. Directions now open an in-app road route with a line, ETA, distance and steps; if location is denied, the visitor can explicitly start from the map search point. Coordinates are sent to the configured routing service for that request, are not saved to an account, and route responses are not cached by KAYA. The training brief, saved gyms and plan progress live in the visitor's browser storage, not a server account.

## Data and honest limitations

- `data/kenya-gyms.json` is a curated OpenStreetMap extract. `npm run fetch-gyms` refreshes it from Overpass; `npm run curate-gyms` re-applies the quality filter offline. The app also filters out non-fitness sports sites and points outside the Kenya boundary at read time. These are community-mapped listings, **not verified businesses**. Missing prices, ratings, hours or contact data are never invented.
- `data/kenya-places.json` is a filtered [GeoNames Kenya country dump](https://download.geonames.org/export/dump/KE.zip), refreshed with `npm run fetch-places`. It makes town and neighbourhood suggestions and submitted place searches work without a runtime API key. GeoNames is [CC BY 4.0](https://download.geonames.org/export/dump/readme.txt); attribution appears in the app.
- `data/kenya-boundary.json` is a simplified [geoBoundaries gbOpen Kenya ADM0](https://www.geoboundaries.org/api/current/gbOpen/KEN/ADM0/) polygon (RCMRD GeoPortal, public domain). It prevents a rectangular bounds check from admitting neighbouring countries.
- The map uses [OpenFreeMap](https://openfreemap.org/) without a token. Its community-operated service has no contractual uptime guarantee; the static Esri image is a best-effort fallback. Map locations are approximate and can be outdated.
- Driving directions use an OSRM-compatible service. `next dev` uses the [OSRM public demo](https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server) for testing only; that server restricts use to reasonable non-commercial use and offers no uptime guarantee. Production **requires** `OSRM_DRIVING_URL` pointing to a self-hosted or explicitly licensed routing service (for example, an OSRM instance built from the [Kenya OSM extract](https://download.geofabrik.de/africa/kenya.html)). Without it, the app says routing is unavailable and does not invent a route. Use HTTPS for remote routing; local loopback HTTP is allowed. A browser needs HTTPS (or localhost) and visitor consent to get device location. Directions are estimates, not live traffic, live rerouting or hands-free navigation.
- Local text search returns actual name/address matches, not random gyms near the last search point. A selected place searches a stated area around that place; a small radius is not silently enlarged. A nationwide search lists the currently mapped catalog only.
- The plan offers adjustable, conservative workouts and Kenyan-style meal ideas. It does not calculate calories, diagnose conditions, guarantee weight change, or replace a trainer or dietitian. Always check allergies and health restrictions.

Map and listing data © OpenStreetMap contributors. Place names © GeoNames, CC BY 4.0. OpenFreeMap and Esri attribution is retained in the map/fallback.

## Optional production services

The checked-in catalog and gazetteer work without runtime credentials. In development only, a public Overpass/Nominatim instance can supplement a submitted search. In production, configure **authorised** `OVERPASS_ENDPOINTS` and `NOMINATIM_URL` only if you operate or contract for a provider. Public Nominatim is never called for autocomplete. The default production behavior is local-first and does not depend on either service.

The in-process rate limiter and cache protect a single app instance; use a shared platform limiter/cache before high-traffic launch. The current app has no accounts, owner verification, lead delivery, payments, or real-time opening-hours guarantee. Those require business onboarding, a durable database, privacy review, and payment credentials. Do not advertise paid placement or "verified" listings until those systems and human checks exist.

The app does not use Google Places content on a non-Google map. Directions stay inside KAYA and do not need a Google account or Google Maps API key.
