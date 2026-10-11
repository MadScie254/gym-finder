# Decisions

One line each: what, why, evidence. Do not re-litigate the brief.

- 2026-10-11 — Product name is **Find My Gym**, not KAYA. Owner chose the brief palette (`#C82F0B`) and a new name. Trust copy: “Verified by Find My Gym” only from an override file.
- 2026-10-11 — Data-in-Git for published files (`public/data/gyms.<hash>.json`, `manifest.json`, `landmarks.json`). Raw snapshots stay in gitignored `data/source/`. Monthly Action opens a PR that updates published files. Why: SPA must run without DuckDB on a contributor machine.
- 2026-10-11 — Abandon in-app OSRM (`app/api/map/route`, RoutePanel) at cutover. Brief F-13 is Google Maps URL + `geo:`; F-20 is straight-line geometry. In-app routing needs a server.
- 2026-10-11 — DuckDB via `@duckdb/node-api` on CI (Node 24). Local Node 26 / Windows is missing `@duckdb/node-bindings-win32-x64`; extract-overture.mjs uses a DuckDB CLI in `tools/` if present. Do not commit the CLI. Python is not installed on this machine.
- 2026-10-11 — Overture extract could not be run in this session (no DuckDB CLI, no Python, Node bindings fail). OSM extract + merge still run. D1 is not claimed until Overture lands.
- 2026-10-11 — Golden-set CI uses the brief seed (present in source data). Web-researched names are candidates only if they appear in the built catalog. Never ingest listicle prices/hours/ratings. Catalog remains Overture ∪ OSM ∪ overrides.
- 2026-10-11 — Pin after `npm view` (2026-10-11): Vite 8.3.4, `@vitejs/plugin-react` 6.1.2, React 19.2.8, React Router 7.18.4 (7.x as specified; 8.4.0 also current), Zustand 5.0.15, MiniSearch 7.2.0, Zod 4.6.6, libphonenumber-js 1.13.15, `@duckdb/node-api` 1.5.6-r.1, lucide-react 1.55.0, vaul 1.1.2, vite-plugin-pwa 2.0.0, `@fontsource-variable/inter` 5.3.0, opening_hours 3.15.0 (still maintained).
- 2026-10-11 — `@` alias: Vite maps `@` → `src/`; `@data` → `data/`. Next keeps root `@/` until cutover.
- 2026-10-11 — RESEARCH_FINDINGS.md missing in this clone. Do not recreate; open only if it appears.
