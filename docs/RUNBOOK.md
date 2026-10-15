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
- Then `npm run data:build` and `npm run data:validate`. The build prints a short summary (sources, removals, merges, OSM-in-Overture match rate, tiers, coverage targets, output file) and is deterministic: the same inputs on the same day give byte-identical files (`BUILD_AS_OF=YYYY-MM-DD` pins the date that tiers and staleness are measured against). Only the current `public/data/gyms.<hash>.json` is kept.
- Side logs for a human, all in gitignored `data/source/`:
  - `review-candidates.json`: pairs never merged automatically. `proximity-only` (within 60 m, nothing else agrees), `name-near` (same name 150-500 m apart), `shared-contact-distant` (same phone or own website but too far apart: usually branches of a chain). Decide them in `data/overrides/merge.json`.
  - `denylist-hits.json`: every record removed by the name deny-list, `exclude.json` or its category, and every record held back as unconfirmed because its name reads as a hotel, hall, stadium and so on. A false positive goes in `allow.json`.
  - `dropped-phones.json`: numbers that did not validate as Kenyan.
  - `research-log.json` (only with a research file): skipped, closed and ambiguous findings.
- `node scripts/data/diff-report.mjs <previous manifest.json>` prints the PR-body diff: counts by tier, added/removed/renamed, venues that lost a source or changed tier, and what waits for review.

The refresh Action needs the repo setting "Allow GitHub Actions to create and approve pull requests". PRs opened by `GITHUB_TOKEN` do not start `ci.yml`, so the Action runs validate and the tests itself; set a `DATA_REFRESH_TOKEN` secret (PAT or app token) if you also want CI on the PR.

## Web research (optional source)

`data/research/venues-researched.json` comes from the web-research workflow. The build works without it. When it is present:

- Only `status` "operating"/"open" is imported. "closed" removes the venue it matches (logged). Anything hedged ("uncertain", "unknown", "likely operating", "operating (unverified)") is never imported.
- The file has no coordinates, so a finding is placed at the centre of its suburb (2 km uncertainty) or town (8 km) from `data/kenya-places.json`. It matches an OSM/Overture venue by seed id, phone, own website, or name within that radius, and joins at most one venue: if two venues match equally well it is left out and logged as ambiguous, so one finding can never fuse two branches or close both.
- A match keeps the OSM/Overture name and location. Web data fills gaps only (hours text, a missing phone). The web counts as an extra independent source (it can lift a venue to Corroborated) only when an evidence page that was fetched and quoted is the venue's own website or its official Facebook/Instagram page. Directories and listicles never count.
- A finding that matches nothing is published as **Listed**, never higher, with a reason "Found by web research on <date>; not independently confirmed" and a note that the map pin is approximate. Evidence URLs stay in `provenance.evidence`.

## Places

Area is the nearest GeoNames suburb within 2 km. County is a source county name (Overture `locality`/`region`, OSM `addr:county`) when it is plausibly near, else the nearest county centroid; an OSM record takes the county of a hinted neighbour within 1.5 km. Town is "Nairobi" for every venue in Nairobi City County, elsewhere the nearest town within 30 km that is not named after another county. Centroids are not borders: a few venues on the Nairobi/Kiambu edge (around Ruaka) may carry the wrong county until county polygons are added.

## Human overrides (this is the CMS)

Edit files in `data/overrides/` via the GitHub web UI, then open a PR.

- `venues/<slug>.json` — set fields, `verifiedAt` (ISO date), `verification`: `phone|visit|owner`. `closed: true` tombstones the listing.
- `exclude.json` — `[{ "id": "gers:…", "reason": "supplements shop" }]`
- `allow.json` — `[{ "id": "gers:…", "reason": "…" }]` keeps a record the name deny-list would remove (a reviewed false positive).
- `merge.json` — `[{ "a": "osm:node/1", "b": "gers:…", "reason": "…" }]` for forced pairs. Never merge on proximity alone.
- `known-closed.json` — `["Name", { "name": "…", "area": "…" }]`: names the owner says are closed; CI asserts they are absent.

Every file is validated with Zod; an invalid one fails the build (all files are arrays, `[]` when empty).

Verified is only produced by a `verifiedAt` ≤ 12 months. Nothing else may use that word.

## Corrections that belong upstream

Use “Edit on OpenStreetMap” from a venue page so the next extract picks them up.

## Rollback

Revert the data PR. The previous `gyms.<hash>.json` is in git history. Point `manifest.json` back if needed.
