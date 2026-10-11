# Find My Gym — progress ledger

Keep ≤150 lines. Update at the end of every slice. Resume from this file + git log.

## Current

- Phase: P0 — Truth & foundations
- Branch: `feat/vite-spa`
- Tag: `legacy-next` → `e4a2169` (Next.js KAYA + in-app OSRM; OSRM will be deleted at cutover)
- Last commit: pending (P0 scaffold + pipeline on feat/vite-spa)
- Product name: **Find My Gym** (owner override; palette unchanged)

## P0 slice plan

1. F-00 Scaffold: Vite 8 + React 19.2 + Router 7 + Tailwind 4 + Vitest; port kenya/places/planner/storage/URL-safety; Venue type; Next stays until `/` renders.
2. F-01 Pipeline: Overture DuckDB extract ∪ OSM extract ∪ overrides → gyms.json + manifest + landmarks; Zod gates; licences; RUNBOOK; data-refresh.yml. Report D1/D3.
3. F-02 Client data: load manifest + hashed gyms once; MiniSearch; useVenues(); index-time note.
4. F-03 Golden tests from brief seed (+ web-candidates only if in catalog).
5. Cutover: delete Next/server; `_headers`; rewrite AGENTS/CLAUDE; CI green; draft PR.

## Next 3 steps

1. Run Overture extract on CI (Node 24) or with a local DuckDB CLI in `tools/`.
2. `npm run data:build && npm run data:validate` and record D1/D3.
3. Cut over: delete Next, rewrite AGENTS, draft PR.

## Open questions (owner)

- Support WhatsApp/email + who verifies listings
- Cloudflare account/domain
- Swahili reviewer
- Counsel: ODbL/CDLA/Apache/CC mix + Kenya DPA
- Analytics: none until chosen
- Known-closed gyms for `known-closed.json`

## Deviations

- Name is Find My Gym, not KAYA — see DECISIONS.md
- Published data will be committed (data-in-Git); raw `data/source/` gitignored
- In-app OSRM (commit e4a2169) is abandoned at cutover — F-13 is Maps URL + geo:
- RESEARCH_FINDINGS.md is not in this clone; do not recreate

## D1–D8 (measured)

| Gate | Status |
| --- | --- |
| D1 Coverage | 58 visible (OSM-only fallback). Overture extract not run. Not ≥400. |
| D2 Findability | golden tests run against OSM-only catalog |
| D3 Actionability | 10/58 (17%) have a contact. Not ≥75%. |
| D4 Honesty | address never "Kenya" in new Venue type; Verified only from override |
| D5 Zero server | Vite `dist/` is static; Next still in repo until cutover |
| D6 Speed | Vite JS 80 KB gzip (map not yet). Lighthouse not run. |
| D7 Offline | not built |
| D8 Quality | src/lib + merge/trust tests 20 passed; `npm run check` not fully green (Next still present; validate fails until Overture) |

## Notes

- Do not load datasets into chat. Query with jq / DuckDB LIMIT.
- One slice = one commit. Never force-push main/master.
