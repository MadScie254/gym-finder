# Kenya Gym Finder

Progressive web app that finds gyms across Kenya using Google Maps Places, then ranks them by distance, rating, and a short client profile (goals, budget, amenities). Install it from the browser, or package a lite Android APK later with [PWABuilder](https://www.pwabuilder.com/).

## Setup

1. Copy `.env.example` to `.env.local`.
2. Create a Google Cloud project with billing enabled and turn on:
   - Maps JavaScript API
   - Places API (New)
3. Add keys:
   - `NEXT_PUBLIC_GOOGLE_MAPS_KEY` — browser key, restrict by HTTP referrer
   - `GOOGLE_MAPS_SERVER_KEY` — server key for Places, restrict by IP  
     For local demo, one unrestricted key can fill both variables.
4. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without keys the UI still runs on a small Kenya demo dataset.

## Using the app

- Allow location to see nearby gyms, or search any Kenyan county/city.
- Complete (or skip) onboarding so suggestions can prefer your goals and budget.
- Filter by open now, rating, price, and radius.
- Tap **Search this area** after panning the map.
- On Android Chrome, use **Install app**. On iPhone Safari: Share → Add to Home Screen.

## Deploy

Vercel is the simplest host for this Next.js app. After it is live, you can generate a lite APK from the public URL with PWABuilder. iOS remains Add to Home Screen (no sideloaded IPA from a PWA).
