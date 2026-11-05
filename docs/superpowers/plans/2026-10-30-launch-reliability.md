# Launch Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the highest-impact technical launch gaps without inventing gym data or adding a backend.

**Architecture:** Keep the React/Vite static app. Isolate testable map and generated-HTML behavior, then exercise UI and offline paths in the browser. Preserve existing user edits.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, MapLibre, Node ESM.

**Spec:** `docs/superpowers/specs/2026-10-30-launch-reliability-design.md`

## Global Constraints

- Static React + Vite; no Next.js, database, runtime API keys, Google Places, or invented listing facts.
- Location remains on device. No PR or remote publish.
- Current catalogue is an OpenStreetMap snapshot only until Overture extraction succeeds.
- Preserve pre-existing uncommitted work in `Shell.tsx`, `MapPane.tsx`, `styles.css`, and `vite.config.ts`.

## Review Focus

- First map render with venues already loaded must show pins.
- Selected gym and user-location transitions must not strand the camera over Nairobi.
- Mobile list mode must leave the Map control reachable.
- Malicious venue names must not break out of generated HTML or JSON-LD.
- Offline JSON misses must not return the HTML shell.

---

### Task 1: Map and mobile layout

**Files:** `src/features/map/MapPane.tsx`, `src/app/Shell.tsx`, `src/features/explore/Explore.tsx`, `src/styles.css`, map-focused tests.

**Interfaces:** MapPane consumes `venues`, `selectedId`, and a nullable `origin`; the map source receives the current venue collection when created and when filtered. Shell owns list/map mode.

- [ ] Write failing tests for first-load map data and camera target selection; run them and confirm RED.
- [ ] Implement source initialization, selection/location focus, and mobile list-first toggle; run tests and confirm GREEN.
- [ ] Run the full test suite, types and lint; manually check mobile map/list.

### Task 2: Honest decision flow

**Files:** `src/features/results/ResultCard.tsx`, `src/features/compare/ComparePage.tsx`, `src/features/commute/CommutePage.tsx`, `src/features/explore/Explore.tsx`, decision-flow tests.

**Interfaces:** Compare selection travels through URL `ids` with at most three valid venue IDs; result cards provide the control. Commute retains its existing straight-line calculation but labels it accurately.

- [ ] Write failing tests for compare selection, invalid IDs, and straight-line copy; confirm RED.
- [ ] Implement user-visible compare controls and accurate distance/commute wording; confirm GREEN.
- [ ] Run the full test suite, types and lint.

### Task 3: Safe static gym pages

**Files:** `scripts/prerender.mjs`, `scripts/prerender.test.mjs` or Vitest equivalent, `README.md`.

**Interfaces:** Build-time `SITE_URL` overrides documented `https://findmygym.ke` default; generated gym URLs and sitemap locations are absolute.

- [ ] Write failing output-level tests for crawlable body, absolute URLs and hostile name escaping; confirm RED.
- [ ] Implement HTML generation and URL handling; confirm GREEN.
- [ ] Run `npm run check` and inspect a generated page and sitemap.

### Task 4: Offline and workflow honesty

**Files:** `public/sw.js`, offline tests, `.github/workflows/ci.yml`, `.github/workflows/data-refresh.yml`, `README.md`.

**Interfaces:** The service worker caches successful same-origin GET responses and uses a navigation-only HTML fallback; CI exposes the data gate, and refresh uploads reviewable artifacts without a PR.

- [ ] Write failing offline behavior tests (data miss and cache lifecycle); confirm RED.
- [ ] Implement service-worker policy and workflow edits; confirm GREEN.
- [ ] Run `npm run check`, `npm run data:validate`, and a manual offline smoke test. Report the expected catalogue-gate failure separately.

## Execution notes

Execute in this checkout because the user requested work in the repository and the relevant map/layout files already contain uncommitted edits. Do not reset or stage those pre-existing hunks without identifying them. A human-reviewed data sourcing and monetization pilot is a separate track, not something software can certify.
