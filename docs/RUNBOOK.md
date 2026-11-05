# Runbook — Find My Gym data

## Monthly refresh

1. GitHub Action `.github/workflows/data-refresh.yml` runs on cron or `workflow_dispatch`.
2. It extracts the latest Overture Places release (STAC `latest`) and OSM Overpass (or reuses the last OSM snapshot if Overpass fails, marking `osmStale`).
3. `build-gyms.mjs` merges, tiers, and writes `public/data/gyms.<hash>.json`, `manifest.json`, `landmarks.json`.
4. `validate.mjs` must pass. `diff-report.mjs` summarises adds/removes/renames.
5. The Action opens a PR. A human skims the diff and merges. Deploy publishes the static files.

Local:

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
