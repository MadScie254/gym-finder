# Runbook — Find My Gym data

## Monthly refresh

There is no scheduled workflow yet (GitHub Actions is restricted on this account). Refresh by hand, about once a month:

1. `npm run data:extract` pulls the latest Overture Places release over HTTPS and OSM Overpass (or reuses the last OSM snapshot if Overpass fails, marking `osmStale`).
2. `npm run data:build` merges, tiers, and writes `public/data/gyms.<hash>.json`, `manifest.json`, `landmarks.json`.
3. `npm run data:validate` must pass.
4. Skim the diff, run `npm run check`, commit, push. Vercel publishes the static files.

When Actions works again, add a `data-refresh.yml` that runs these three commands and opens a PR.

Commands:

```bash
npm run data:extract
npm run data:build
npm run data:validate
```

If Overpass is down, keep `data/source/osm-venues.json` and re-run build. Do not invent venues.

## Human overrides (this is the CMS)

Edit files in `data/overrides/` via the GitHub web UI, then open a PR.

- `venues/<slug>.json` — set fields, `verifiedAt` (ISO date), `verification`: `phone|visit|owner`. `closed: true` tombstones the listing.
- `exclude.json` — `{ "id": "gers:…", "reason": "supplements shop" }`
- `merge.json` — `{ "a": "osm:node/1", "b": "gers:…" }` for forced pairs. Never merge on proximity alone.
- `known-closed.json` — names the owner says are closed; CI asserts they are absent.

Verified is only produced by a `verifiedAt` ≤ 12 months. Nothing else may use that word.

## Corrections that belong upstream

Use “Edit on OpenStreetMap” from a venue page so the next extract picks them up.

## Rollback

Revert the data PR. The previous `gyms.<hash>.json` is in git history. Point `manifest.json` back if needed.
