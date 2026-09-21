# Kenya Gym Finder (KAYA)

Progressive web app that finds mapped gyms across Kenya: MapLibre with an Esri street-map proxy, [Overpass](https://overpass-api.de/) for venues, and a configurable Nominatim-compatible geocoder for manual searches. Suggestions rank primarily by distance and the training brief; availability and price are shown only when mapped data supports them.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app starts in Nairobi until a visitor explicitly asks to use their location. If a provider is unavailable, it shows an honest empty state rather than fabricated gym results.

## Using the app

- Search any Kenyan county/city, or use **Near me** to share location for that lookup.
- Set goals, budget, and amenities so matches re-rank.
- Filter by price and radius; fields based on incomplete OSM tags remain clearly optional.
- Install from the browser, or wrap the hosted URL with [PWABuilder](https://www.pwabuilder.com/).

Map data © OpenStreetMap contributors. Basemap © Esri.

## Production providers

Public Nominatim and Overpass instances are enabled only during local
development and are not a production backend. Before deploying, configure
`NOMINATIM_URL`, `OVERPASS_ENDPOINTS`, and a contactable `OSM_USER_AGENT`
using services you are authorised to operate at your expected traffic level.
The app fails with an honest empty state when these production providers are
not configured.

Search suggestions are intentionally local (Kenya's counties). A typed fragment
must be an exact county name or a prefix of at least three characters, so short
strings are not treated as a county. A town, estate, or gym lookup reaches the
configured geocoder only when the visitor submits the search. Same-origin API
routes validate, rate-limit, cache, coalesce, and time out provider requests.
Overpass calls use the same minimum spacing as the geocoder. The in-memory
limiter keys each client by a trusted address (a configured
`TRUSTED_CLIENT_IP_HEADER`, otherwise the right-most `X-Forwarded-For` hop) and
does not put unidentified production traffic in one shared bucket. It is still
process-local: replace it with the platform's durable limiter when more than
one instance serves traffic.

`ESRI_TILE_URL` and `ESRI_EXPORT_URL` are required in production. The map proxy
then allows only tiles that intersect the Kenya map bounds and only
`image/jpeg`, `image/png`, or `image/webp` responses. Local development can use
Esri's public World Street Map; production does not select that service unless
you set the URLs yourself. Review the selected provider's attribution, usage
limits, and SLA before launch.
