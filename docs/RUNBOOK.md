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

## Running the extract locally

`data/source/` is gitignored; `npm run data:extract` rebuilds it (about 10 s for Overture).

- **Overture** (`scripts/data/extract-overture.mjs`): reads the latest release id from STAC and the Places parquet over HTTPS (never `s3://`; some proxies inject fake AWS keys). Engine: a DuckDB CLI if one exists (`DUCKDB_BIN`, `tools/duckdb[.exe]`, or `duckdb` on PATH), else the `@duckdb/node-api` devDependency. If the node bindings do not load on your OS or Node version, drop a CLI into `tools/` (not committed). Pin a release with `OVERTURE_RELEASE=2026-09-23.1`. It writes newline-delimited JSON plus `overture-meta.json` and fails, leaving old files in place, if fewer than 250 country-KE venues come back (`OVERTURE_MIN_VENUES`).
- **OSM** (`scripts/data/extract-osm.mjs`): tries four Overpass mirrors with short timeouts. If every mirror fails it keeps the previous `osm-venues.json`, or imports the checked-in 58-gym `data/kenya-gyms.json` when there is none (`node scripts/data/import-legacy-osm.mjs`), and writes `osmStale: true` with a `staleReason`. The build copies that flag into `manifest.json`, and the refresh PR shows a warning. Re-run later when Overpass is back; `OSM_OFFLINE=1` skips the network on purpose.
- Then `npm run data:build` and `npm run data:validate`. The build also writes `data/source/review-candidates.json` (proximity-only pairs; decide them by hand in `data/overrides/merge.json`).

The refresh Action needs the repo setting "Allow GitHub Actions to create and approve pull requests". PRs opened by `GITHUB_TOKEN` do not start `ci.yml`, so the Action runs validate and the tests itself; set a `DATA_REFRESH_TOKEN` secret (PAT or app token) if you also want CI on the PR.

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
