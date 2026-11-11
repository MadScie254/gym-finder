# Find My Gym — full revamp plan

Written 2026-11-11 for a separate executor model. Plan only: nothing here is built yet.
Base everything on `master` (commit `2b62141`), not on older branches.

---

## 0. Where things stand (checked 2026-11-11)

| Fact | Value |
|---|---|
| `master` | Vite 8 + React 19 + React Router 7 SPA, 45 source files, `vercel.json` present |
| Catalogue on `master` | 566 venues, 497 shown by default, 0 verified, built 2026-11-05 |
| Gym detail data | Hours on about 9 gyms, prices on 0, amenities on 0, photos on 0 (measured 2026-10-17 on 438 gyms; re-measure) |
| Counties with no gyms | 19 of 47 (same caveat) |
| Current look | Cream `#f5f2ea` + terracotta `#c34722` + dark green ink, one 537-line stylesheet. This is the most common AI-generated palette; it is the main reason the app "tastes of AI". |
| Maps | MapLibre + an optional Google Maps pane behind `VITE_GOOGLE_*` |
| Branch `claude/nice-bardeen-y469ws` (PR #5) | Now `master` plus: these docs, the October research files in `data/research/`, and three fixes `master` lacks: place pages filter by place, not fuzzy text (`venuesInPlace` in `src/lib/filterVenues.ts`); cluster label font fix (`Noto Sans Regular`); report links use the real origin instead of the invented `findmygym.ke`. Merge PR #5 first, or port these in Phase 1. |
| Live copies | Cloudflare: `https://find-my-gym.dmwanjala254.workers.dev` (old build). `master` also has `vercel.json`. Pick one host (decision D2). |
| CI | GitHub Actions jobs on this repo failed before any step ran in October (no runner assigned). Recheck. |

### What the food services really offer (researched 2026-11-11)

- **Glovo** publishes APIs for merchants who sell on Glovo (catalogue, orders). It has no public API for a third-party app to browse menus, read prices or place orders. So "integrate Glovo" can mean two things: (a) link out to Glovo, which needs no permission, or (b) a commercial partnership, which only the owner can start at `sell.glovoapp.com/ke` or through Glovo's partnerships team.
- **"Food Plus"** was taken to mean **Chandarana Foodplus**, the Kenyan supermarket chain. It sells online at `foodplus.co.ke`, takes WhatsApp orders, and lists branches publicly. No public API was found. Confirm this is the service meant (decision D1).
- Never scrape either service for menus, prices or delivery times. Link out, or use data the partner gives us.

---

## 1. Product in one paragraph

Find My Gym helps someone in Kenya pick a real gym, get there, and fuel the session. The gym side answers three questions: is it real, where is it, can I reach them now. The new fuel side turns the training plan into meals and a shopping list, then hands the user to Glovo, Chandarana Foodplus or another service to order. The app stays honest: it never shows a price, menu, opening time or rating it cannot source.

---

## 2. Owner decisions (answered 2026-11-11)

These override anything below that conflicts.

| # | Decision | Answer |
|---|---|---|
| D1 | Food scope | Recommend food, then show a store; tapping the store opens it. **Build as a simulation first** (see 2.1). Real Glovo / Foodplus wiring comes later. |
| D2 | Host | Executor's choice of the easiest. **Use Vercel**: it is already connected to the GitHub repo, builds a preview for every push, and `master` already has `vercel.json`. Retire the Cloudflare deployment once Vercel production is confirmed. |
| D3 | Database | No real backend yet. Simulate: claims, reports and added gyms are stored in the browser (localStorage) behind one `src/lib/backend.ts` interface, so a real endpoint can replace it later without touching the UI. |
| D4 | Support contact | Claims and reports go to the owner's WhatsApp and email. Read both from `VITE_SUPPORT_WHATSAPP` and `VITE_SUPPORT_EMAIL` set in Vercel; never commit them. `VITE_SUPPORT_WHATSAPP` was set in the Vercel project on 2026-11-11 (all environments); it takes effect on the next deploy. `VITE_SUPPORT_EMAIL` stays unset on purpose: a `VITE_` value ships in the public bundle, so a personal email would be exposed to scrapers, and `src/lib/report.ts` already prefers WhatsApp. Add a role address (for example `support@<domain>`) once the app has its own domain. |
| D5 | Partnerships | Deferred. No outreach, no partner logos, no tracked links yet. |
| D6 | Design | Owner delegated the choice. **Signwriter** (section 3) is the direction. |
| D7 | Golden list | Owner will not supply one and suggested scraping Google Maps. Do not: it breaks Google's terms and the data cannot be republished. Instead build the list from the catalogue: take the 40 strongest venues (corroborated, with phone and own website, spread across counties), open each gym's own website to confirm it is operating, and record the check in `data/overrides/venues/`. Those become the golden set and the first verified profiles. |
| D8 | Photos | Unchanged: owner-supplied or openly licensed only. |
| — | Git flow | GitHub Actions is locked on the owner's account (plan not paid), so CI does not run. Until that is fixed: merge straight to `master`, and treat a local `npm run check` plus the Vercel preview as the gate. |

### 2.1 What "simulation" means

- A visible "Demo" marker on every simulated screen, and one line on the Fuel home: "Demo stores and sample menus. Ordering is not live yet."
- Simulated stores use invented names (for example "Demo: Protein Kitchen, Westlands"), sample menu items and sample prices marked "sample". Never put invented menus, prices or delivery times under a real brand name.
- Real services (Glovo, Chandarana Foodplus) appear only as a plain "Open Glovo" / "Open Foodplus" link to their public site, with the non-affiliation line.
- The full flow works end to end on demo data: recommendation, store list, store page, basket, "order placed" confirmation stored locally. No payment, no real order, and the confirmation says so.
- Demo data lives in `data/fuel/demo-stores.json`, loaded only when `VITE_FUEL_MODE=demo` (the default). Switching to live later means adding `services.json` entries and setting `VITE_FUEL_MODE=live`.
- Gym data is never simulated. The catalogue stays real and sourced.

---

## 3. Design direction: "Signwriter"

### 3.1 Where it comes from

Kenyan gyms announce themselves with hand-painted signs: enamel blue, road-marking yellow, white block letters on a wall or a gate. Inside, the visual world is iron plates, kilogram numerals and chalk. The design borrows that: enamel colour, condensed block lettering, big honest numerals. It does not borrow the wellness-app look (cream paper, serif headlines, terracotta).

### 3.2 Tokens

| Token | Light | Use |
|---|---|---|
| `chalk` | `#F2F4F7` | Page background (cool, not cream) |
| `white-enamel` | `#FFFFFF` | Cards, sheets |
| `plate` | `#1B2333` | Text, iron-plate surfaces |
| `cobalt` | `#2346D8` | Primary actions, links, selected pin |
| `signal` | `#FFC42E` | One highlight per screen: the open-now flag, the active filter. Always with `plate` text. |
| `court` | `#0C8558` | Verified, open |
| `stop` | `#D23A2A` | Closed, errors only. Never decoration. |
| `slate` | `#5A6477` | Secondary text |

Dark theme: background `plate`, cards `#252E42`, text `chalk`, cobalt lifted to `#6F8BFF`, signal unchanged. The executor must compute WCAG contrast for every text pair (4.5:1 minimum) and adjust hex values that fail; the values above are a starting point, not measured.

Trust tiers keep shape + icon + word, never colour alone: Verified (court, filled roundel), Corroborated (cobalt, double ring), Listed (slate, single ring), Unconfirmed (slate, dashed ring).

### 3.3 Type

One family: **Archivo** variable (width and weight axes), self-hosted via Fontsource, Latin subset.
- Headings and gym names: width 75 to 87 (condensed), weight 700 to 800, tight tracking. Reads like sign lettering.
- Body and UI: width 100, weight 400 to 600, 16 px minimum on mobile.
- Numerals: tabular. Distance, time and price are set large, condensed, in `plate`, like plate markings.
- Scale (px): 12, 14, 16, 18, 22, 28, 38, 52. Sentence case everywhere. No all-caps labels, no eyebrow text above headings, no monospace for data.

If Archivo's width axis is unavailable in the Fontsource build, fall back to Archivo + Archivo Narrow. Verify before committing.

### 3.4 Shape, depth, motion

- Radii by role: 4 px chips and badges, 10 px cards, 20 px bottom sheet top corners. Not one radius everywhere.
- Depth: cards sit on `chalk` with a 1 px `plate` 10% border, no shadow. Only the bottom sheet and menus cast a shadow.
- The one bold element: the **distance block** on each gym card, a `plate` rectangle with large condensed numerals ("1.2 km"), turning `signal` when the gym is open now. Everything else stays quiet.
- Map pins: a round plate seen face-on (ring + hub). Cluster = stacked plate with a count. Selected = cobalt, larger, with the name.
- Motion: sheet and panel transitions 160 to 200 ms. One page-load moment: map pins drop in once. No scroll-triggered fades. Everything off under `prefers-reduced-motion`.

### 3.5 Layout

Mobile (primary):
```
┌──────────────────────────┐
│ [search field         ⌖] │  search + locate, always visible
│ (Gym)(Open now)(< 5 km)… │  filter chips, scroll sideways
│                          │
│        MAP (plates)      │
│                          │
├──────── sheet ───────────┤  3 stops: peek / half / full
│ ██1.2 km██ Level 24      │  distance block + name
│ Parklands · Corroborated │
│ [Call] [WhatsApp] [Save] │  one row of actions, 44 px
├──────────────────────────┤
│ Gyms   Fuel   Plan  Saved│  bottom nav, 4 items
└──────────────────────────┘
```
Desktop: 420 px left rail (search, chips, list or detail pushed in), map fills the rest. Detail is a panel, never a modal. Left-aligned text throughout; nothing centred except empty states.

### 3.6 Things the executor must not do

Cream or beige backgrounds; terracotta, vermilion or acid-green accents; serif display type; gradient washes; identical rounded cards with the same soft shadow; all-caps tracked labels; "A · B · C" meta strings (use commas or separate lines); arrows appended to button text; numbered section markers; stock photos; emoji as icons; a spinner where a skeleton fits.

### 3.7 How to reach "Figma level"

1. Load skills: `frontend-design:frontend-design`, `design:design-system`, `figma:figma-use`, `figma:figma-generate-library`, `figma:figma-generate-design`.
2. Build the design system in Figma first through the Figma connector: variables for every token (light + dark modes), text styles, then components with variants (Button, Chip, TrustBadge, DistanceBlock, GymCard, ActionRow, Sheet, NavBar, SearchField, FuelCard, Skeleton, Banner, EmptyState).
3. Compose the 14 screens in section 4 at 390 and 1440 wide, with real catalogue data (real gym names, real areas), including the thin-data and empty states.
4. Run `design:design-critique` and `design:accessibility-review` on the Figma screens. Fix. The owner signs off on the Figma file before any UI code.
5. Then code from Figma with `figma:figma-design-to-code`, tokens exported to CSS variables, and `figma:figma-code-connect` mapping components.
6. Reference research: Mobbin needed a paid plan in October. If it works now, pull map-list and place-detail patterns; if not, skip it.
7. All interface copy goes through `design:ux-copy`, then the installed humanizer skill, so it does not read as generated.

---

## 4. Screens

Gyms: 1 Explore (map + list) · 2 Search (typing, results, none) · 3 Gym detail (rich / thin data / unconfirmed) · 4 Filters · 5 Place page ("Gyms in Kilimani") · 6 Compare.
Fuel: 7 Fuel home · 8 Meal plan and shopping list · 9 Order hand-off sheet.
Plan: 10 Training plan · 11 Saved gyms.
Trust and system: 12 About the data · 13 Report / add / claim · 14 Offline, error, 404, install.

Navigation: Gyms, Fuel, Plan, Saved. Legal, language (English, Swahili) and About live under a menu on the Gyms header.

---

## 5. Features

### 5.1 Gyms (finish what exists)

| ID | Feature | Done when |
|---|---|---|
| G1 | Map and list act as one control | Picking a gym or place moves the map; moving the map filters the list and shows "N gyms in this area" |
| G2 | Search: gyms, areas, landmarks, counties in grouped results; typo-tolerant | "slaute gym" finds Salute Gym; "near Sarit" works (wire `landmarks.json`); `/in/Kisumu` never lists Kiambu gyms (port `venuesInPlace`) |
| G3 | Filters: type, distance, trust level, has phone, open now (only gyms with known hours), sort by distance or trust | Each chip shows a count; URL holds the state; reload restores it |
| G4 | Gym detail | Distance block, trust badge with plain reasons as a list, address or "Address not listed", hours or "Hours not listed, call to confirm", one action row (Directions, Call, WhatsApp, Website, Share), sources, "Something wrong?" |
| G5 | Compare up to 3 | Add from any card; table of distance, trust, hours, contacts; shareable URL. No pasting of ids. |
| G6 | Saved | Notes per gym, reorder, export/import file, share list as a link |
| G7 | Report, add a gym, claim your gym | Works with D4 (links) or D3 (form). Hidden, not dead, when neither is configured. |
| G8 | Place and county pages prerendered for search engines | `/in/<place>/` and `/county/<slug>/` exist as static HTML with title, description, JSON-LD list; sitemap includes them |
| G9 | Offline and install | Real service worker (precache shell + data, cached tiles for last area), install prompt, "Offline, showing data from <date>" banner |
| G10 | Swahili | Every string translated and reviewed by a native speaker |

### 5.2 Fuel (new)

| ID | Feature | Done when |
|---|---|---|
| F1 | Fuel home | Shows today's meals from the plan, a "what to eat around training" card, and the order options available for the user's town |
| F2 | Meal plan | Restore the full 7-day Kenyan meal plan from `src/lib/planner.ts` (omnivore and vegetarian), with the existing safety wording. No calorie or medical claims. |
| F3 | Shopping list | One tap turns the week's meals into a deduplicated list grouped by aisle (produce, grains, protein, dairy). User can tick items, edit, copy, or share. Quantities are for one person per week and marked as estimates. |
| F4 | Order hand-off | A sheet with a card per service. Each card states exactly what happens: "Opens Glovo. You search and pay there." Glovo: opens the Glovo site or app for the user's city. Foodplus: opens `foodplus.co.ke`, or WhatsApp with the shopping list prefilled, plus the nearest branch. Others per D1. |
| F5 | Coverage honesty | A service appears only for towns where it operates, from a reviewed file `data/fuel/services.json` (service, towns, URL pattern, WhatsApp, verifiedAt, source URL). Unknown town: "We don't know which delivery services reach you yet." |
| F6 | Near-gym fuel (optional) | On a gym page, "Food shops nearby" from the landmarks data (supermarkets within 1 km), link to directions. No ratings. |
| F7 | Partner mode (after D5) | If Glovo or Foodplus agrees: tracked links, their logo under their brand rules, and any data they supply. Until then, name them in plain text and add "Find My Gym is not affiliated with Glovo or Chandarana Foodplus." |

Rules for Fuel: no menus, prices, delivery fees or delivery times unless a partner supplies them in writing. No logos without permission. Verify every URL pattern and WhatsApp number by opening it before shipping. Record the check date in `services.json`.

### 5.3 Plan

Restore the planner cut during the Vite move: focus, level, days per week, gym or home; 4 weeks with per-session exercises and "done" ticks; pick a saved gym as "my gym"; download the schedule as a calendar file (`.ics`) generated in the browser; print view.

### 5.4 Other things worth adding (owner picks in D1)

- Verified profiles for the top 150 gyms: hours, day-pass and monthly price, amenities, women-only hours, taken from each gym's own website with the source link and date. This fixes the empty detail pages and unlocks "open now" and price filters. Highest value item in this plan.
- Trainers and classes directory (owner-submitted only).
- Running and fitness events calendar.
- Cookieless analytics (searches, calls, WhatsApp taps, order hand-offs) to see what users want next.

---

## 6. Data work

1. Rebuild the catalogue from `master`'s pipeline; record counts by county, tier and field coverage in `docs/PROGRESS.md`.
2. Apply the October review that is still pending on the old branch: `data/research/qa/junk-review.json` (32 to exclude, 12 to rename, 6 to recategorise) and `merge-review.json` (5 false merges, 15 missed). Check each against `master`'s catalogue first; `master` already removed some non-gyms on 2026-11-05.
3. Verified profiles (5.4): one file per gym in `data/overrides/venues/<slug>.json` with `verifiedAt`, `verification`, source URL per field. Research agents propose; a second agent re-opens each source and tries to refute; a human spot-checks 10%.
4. County gaps: targeted research for the empty counties. Accept that some have no gym with a web presence, and say so on the About page.
5. `data/fuel/services.json` per F5, same propose-then-refute rule.
6. Licensing stays as documented in `LICENSE-DATA.md` and `NOTICE`. Get a lawyer's review before commercial launch.

---

## 7. Technical plan

- Keep: Vite 8, React 19, React Router 7, MiniSearch, MapLibre, Vitest, the data pipeline in `scripts/data/`.
- Change: replace the single stylesheet with tokens exported from Figma plus component styles; add Radix primitives for dialog, popover, tabs; add `vaul` (or equivalent) for the bottom sheet; add `lucide-react` icons; add Playwright, `@axe-core/playwright` and Lighthouse CI.
- Decide on the Google Maps pane: keep MapLibre as the only map unless the owner wants Google (needs a billed key; conflicts with the no-key rule in `AGENTS.md`).
- Structure: `src/ui/` (design-system components), `src/features/{gyms,fuel,plan,saved,trust}/`, `src/lib/`, `src/data/`. Components under 250 lines.
- Budgets: first-load JavaScript 200 KB gzip or less (map chunk lazy), catalogue 150 KB gzip or less, fonts 60 KB or less, Lighthouse mobile 90+ performance and 95+ accessibility.
- Security headers stay in `public/_headers` (or the Vercel equivalent after D2); add any new outbound hosts explicitly.

---

## 8. Execution steps for the executor

Each phase ends with: `npm run check` green, the listed gate met, one commit, `docs/PROGRESS.md` updated. Use `superpowers:test-driven-development` for logic and `superpowers:verification-before-completion` before every "done" claim.

**Phase 0 — Align (half a day)**
1. Branch from `master`. Read `docs/DECISIONS.md`, `docs/PROGRESS.md`, this file.
2. Decisions are in section 2. Nothing is missing from the owner. Do not stop to ask questions: where this plan leaves a choice open, pick the option a senior engineer would defend, record it in `docs/DECISIONS.md` in one line, and continue.
3. Run the app; take mobile and desktop screenshots as the "before" record.

**Phase 1 — Foundation fixes (1 day)**
4. Confirm the three fixes from PR #5 (section 0) are on `master`; port them with their tests if not.
5. Remove dead code and unused dependencies; settle the map decision.
6. Add Playwright with one smoke test (search with a typo, open a gym, check Call link). Gate: smoke test green.

**Phase 2 — Design in Figma (2 to 3 days)**
7. Follow section 3.7 steps 1 to 4. Gate: owner approves the Figma file; contrast table recorded.

**Phase 3 — Design system in code (2 days)**
8. Export tokens; build `src/ui/` components against Figma with a component test each; light and dark.
9. Gate: a `/styleguide` dev route shows every component and state; axe reports no serious issues.

**Phase 4 — Gyms rebuild (4 to 5 days)**
10. Build G1 to G6 on the new components, one feature per commit, e2e test per feature.
11. Build G7 to G10. Gate: all G "done when" checks pass on mobile and desktop.

**Phase 5 — Fuel and Plan (3 to 4 days)**
12. Build `data/fuel/demo-stores.json` and the `backend.ts` simulation layer (section 2.1).
13. Build F1 to F4 on demo data: recommendation, store list, store page, basket, local confirmation. Add plain link-outs to Glovo and Foodplus. Restore the planner (5.3). Gate: the whole flow works offline on demo data; every simulated screen shows the Demo marker; real brand links opened and confirmed by hand.

**Phase 6 — Data depth (runs alongside Phases 3 to 5)**
14. Section 6 steps 1 to 4. Gate: 150 verified profiles, "open now" filter returns real results, coverage table published on the About page.

**Phase 7 — Quality and launch (2 days)**
15. Full e2e, axe on every route, Lighthouse budgets, offline test in airplane mode, Swahili review.
16. `/code-review` and `/security-review` over the diff; fix findings.
17. Deploy to Vercel production; smoke-test the live URL in a real browser; update README and RUNBOOK.

Rough total: 15 to 18 working days of agent time, more if usage limits interrupt. Phases 4 and 5 can be split across parallel agents by feature folder.

---

## 9. Risks

| Risk | Handling |
|---|---|
| Glovo or Foodplus object to use of their name or links | Plain-text names, non-affiliation line, remove on request, pursue D5 |
| Users expect in-app ordering | Every card says where it sends them; no fake cart |
| Gym pages still thin at launch | Phase 6 is not optional; ship verified profiles before promoting the app |
| Design drifts back to defaults in code | Figma sign-off first; section 3.6 list is a review checklist; compare screenshots to Figma each phase |
| Usage limits stop long runs | One commit per feature; `docs/PROGRESS.md` is the resume point |
| Two hosts, two truths | D2 before Phase 7; delete the other config |

---

## 10. Not verified in this plan

- The exact Glovo web URL pattern for Kenyan cities, and which Kenyan towns Glovo serves.
- That Uber Eats, Greenspoon or any other service named here operates in Kenya today.
- Contrast ratios for the section 3.2 palette.
- That Archivo's width axis ships in the Fontsource package.
- Current field coverage on `master`'s 566-venue catalogue (figures in section 0 are from the October build).
- Whether GitHub Actions now runs on this repo.
