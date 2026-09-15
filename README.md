# Kenya Gym Finder (KAYA)

Progressive web app that finds gyms across Kenya using **free OpenStreetMap data**: MapLibre + [OpenFreeMap](https://openfreemap.org/) tiles, [Overpass](https://overpass-api.de/) for gyms, and [Nominatim](https://nominatim.org/) for search. Suggestions rank by distance, hours, and a short client brief.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No API keys required. If Overpass is busy, a Kenya sample set is shown.

## Using the app

- Allow location, or search any Kenyan county/city.
- Set goals, budget, and amenities so matches re-rank.
- Filter by open now, price, and radius.
- Install from the browser, or wrap the hosted URL with [PWABuilder](https://www.pwabuilder.com/).

Map data © OpenStreetMap contributors. Tiles by OpenFreeMap.
