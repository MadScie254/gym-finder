# Launch reliability design

The user approved implementation of the 2026-10-23 audit priorities. Improve the existing static React/Vite finder without a database, server, runtime key, fabricated venue facts, Google Places, or a PR.

## Goal and boundary

Make the current OSM-only catalogue easier to use and the build more honest and resilient. This does not claim nationwide coverage, verified gyms, bookings, road routing, or business traction. Those require independently sourced data, gym relationships, and/or a licensed routing service.

## Approaches

1. **Focused reliability release (chosen):** repair map and mobile decision flow, correct misleading UI, produce crawlable safe gym HTML, harden offline behavior, and expose data validation in CI. Keeps the current architecture and makes no invented claims.
2. Full platform rebuild with accounts, backend, booking, and routing: could support transactions but violates the static/no-server constraint and needs provider and business decisions.
3. Cosmetic redesign only: cheaper but leaves the low-contact catalogue and broken flows unresolved.

## Behavior

- Mobile opens on usable results; users can reveal the map and return to the list. The map shows pins on first load and follows a selected gym or explicitly granted device location.
- Result distance is identified as straight-line. Compare works through visible selection controls, not pasted IDs. The commute feature describes proximity to a straight line, not a road detour. Unknown details remain unknown.
- Generated gym HTML contains meaningful escaped venue content without requiring JavaScript. Canonical and sitemap URLs use a configurable absolute site origin; third-party names cannot close a JSON-LD script.
- Offline caching never answers a failed JSON/data request with HTML, caches only successful responses, and removes obsolete caches. The catalogue refresh workflow never opens a PR. CI makes the data-readiness failure visible.
- Preserve current uncommitted Shell, MapPane, styles, and Vite edits. No remote publish or PR.

## Success and non-goals

`npm run check` passes; new regression tests cover the changed behaviors. `npm run data:validate` remains an honest failing launch gate until real data reaches its thresholds. Manual mobile map/list and offline checks supplement automated tests. No claim that missing human-verified data is solved in code.
