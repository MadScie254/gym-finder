# Desktop-app shell, frosted layers, ⌘K and clearer hierarchy

Status: look approved by the owner on 2026-11-16 from a throwaway mockup. This document is the design for the build.

## Intent and why

The owner dislikes how the app looks today and gave four reasons: it is flat and plain, screens show too much at once, the menus and nav are unclear, and the big search box dominates. The product is also meant to install on phones and PCs and open like a real app.

A reference redesign supplied the moves to apply here: a grouped left nav with labels and icons, search tucked into a small ⌘K widget that opens a quick-actions modal, frosted-glass layers with the background showing through, a hierarchy ordered by what people do first with the rest folded into accordions, and a delight moment on the main send button.

## Owner decisions (answered 2026-11-16)

- Desktop gets a left sidebar with labelled groups and icons. Phones keep the bottom tab bar.
- Frosted glass on floating layers only: sidebar, top bar, ⌘K modal, dialogs, menus, compare tray, map controls. Cards stay solid. Glass is for wide screens; phones get solid surfaces. The page behind the glass gets a subtle texture so the blur shows.
- The "win" hover text and looping paper plane go on send actions only: "Send on WhatsApp" in the Report flow.
- Search: a small ⌘K widget on desktop, a search button on phones. Home drops the big box and shows two actions. Find gyms keeps a compact field above the results.
- The ⌘K modal has four groups: gyms and places, go to a page, actions, settings.
- Real-app touches: PC title bar, app shortcuts, install help (including iPhone), a richer install card.
- Delivery: mockup first (done), then phases, each merged and live.

## Visual reference

The approved mockup lives in `docs/design/desktop-shell-mockup/` (screenshots in `shots/`, source beside them). It is the reference for look and feel. Where it differs from this document, this document wins: no key chords, a texture of at most 60 KB, and the real labels and actions on each screen (the mockup's "Start session" and its sample distances and Saved count are placeholders).

Numbers to start from, taken from the mockup (light theme):

- Glass: fill `rgba(255,255,255,.56)`; strong fill `rgba(255,255,255,.74)`; edge `rgba(255,255,255,.92)`; blur `blur(22px) saturate(1.7)`; the modal uses `blur(30px) saturate(1.8)`. Hairline `0 0 0 1px rgba(27,35,51,.10)`; float shadow `0 12px 32px rgba(27,35,51,.12)`; modal shadow `0 28px 70px rgba(27,35,51,.30)`.
- Shape: floating layers 16 px, the palette 20 px, cards 10 px, controls 6 px.
- Sidebar 272 px and top bar 56 px, both inset 12 px from the window edge. Nav rows 40 px. Group labels 13 px, weight 640, slate, sentence case. Active row: 9% cobalt fill and a 3 px cobalt bar. Count chip: plate background.
- Palette: 700 px wide, 7 vh from the top, search row 60 px, result rows 48 px, 540 px list height.
- Home hero: 66 px condensed, two lines. County tiles use a 34 px condensed numeral.
- Send button: label swap 0.26 s ease-out. Plane loop 1.5 s: it leaves up and right by 30 px and 26 px while fading out (to 38%), reappears from down and left (39%), settles at the rest position (72% to 100%), and repeats while hovered.
- Texture: 22 contour levels; minor lines plate at .11, every fourth line cobalt at .26 in the mockup. Phase 1 uses .08 and .10, the strongest values that keep text on the texture above its minimums (see Contrast).

## Goals, non-goals, anti-goals

Goals
- Desktop feels like an app: sidebar, title-bar top bar, depth, keyboard-first search.
- Every screen leads with the next action and folds the rest.
- Installed on a phone or PC, it opens in its own window and looks finished.
- No loss on phones: speed, battery, offline, accessibility.

Non-goals
- No new data, listings, prices or hours. No backend.
- No change to the trust tiers, the Demo marker rules or the Swahili review status.
- No keyboard shortcut chords ("G then F") in the first build. The mockup showed them; they are cut.

Anti-goals (a failure even if it works)
- Glass that fails contrast, or text that is hard to read over the texture.
- A blur that makes a cheap Android phone slow or hot.
- A hover-only feature that phone users never see.
- Motion that ignores reduced-motion settings.
- A button label that claims something was sent when the app only opened WhatsApp.

## Constraints

- Signwriter stays: tokens in `src/ui/tokens.css`, condensed display type for headings and numerals, cobalt actions, signal yellow for open-now and highlights. Its ban list still applies: no gradients, no all-caps tracked labels, no arrows appended to buttons, no numbered section markers. Group labels in the sidebar are sentence case.
- The one bold element stays the distance block on gym cards.
- Honesty rules in `AGENTS.md` stay: nothing invented, location stays on the device.
- Phones are most users. Glass is gated: wide screens only, fine pointer with hover, no `prefers-reduced-transparency`, and `@supports (backdrop-filter)`. Everything else gets a solid surface.
- Accessibility: WCAG 2.2 AA. Contrast is checked on the worst case behind each glass surface, not just the base colour. Visible focus, keyboard-only use, focus returns after the modal closes, reduced motion respected.
- Offline after one visit must keep working. New built files are covered by `scripts/precache.mjs`.
- Every new string exists in English and Swahili (Swahili stays marked as draft).
- The existing 260 unit tests and 40 e2e tests keep passing. Lighthouse on the live site stays at the current 96 to 100.

## Approaches considered

Sidebar: a CSS grid shell that switches at 1100 px (chosen) versus a separate desktop app tree. One nav data model feeds the sidebar, the bottom tabs, the ⌘K "Go to" group and the menu, so they cannot drift.

Glass: tokens plus a gated utility class (chosen) versus blur everywhere versus an SVG filter. Gating gives a solid fallback for free and keeps phones fast.

Command palette: Radix Dialog plus our own listbox (chosen) versus adding `cmdk`. Radix Dialog is already a dependency and gives the focus trap and Escape. A new dependency is not worth it for one list. We reuse `buildSuggestions` so "slaute" still finds Salute Gym.

Win button: stacked labels in one grid cell with CSS keyframes (chosen) versus a JavaScript animation library. CSS needs no bundle and respects `prefers-reduced-motion`.

PC title bar: progressive enhancement with `display_override: ["window-controls-overlay"]` (chosen). Other browsers show a normal bar.

## Design

### Tokens and glass

Add to `tokens.css`, light and dark: `--glass-bg`, `--glass-bg-strong`, `--glass-edge`, `--glass-blur`, `--shadow-float`, `--radius-float` (16 px; sheets stay 20 px), and a texture. A `.glass` utility in `src/ui/base.css` applies them only inside the gating media query and `@supports`. Outside it, the same class gives `--color-surface`, the hairline and `--shadow-float`.

Texture: topographic contour lines as one SVG in `src/ui/texture/`, generated deterministically by `scripts/contours.mjs` and committed. Target at most 60 KB raw (the mockup's was 317 KB: use fewer levels, longer polylines, rounded coordinates). Minor lines plate at about 11%, every fourth line cobalt at about 26%. Dark theme uses lighter lines at lower opacity. The texture sits on `body` only; phones show it at reduced strength under a wash.

Contrast: extend `scripts/contrast.mjs` with glass pairs. Sidebar and top bar glass only ever sits on the textured page, so its text, muted text, links, focus ring and control boundary are checked with each texture line composited under the glass, taking the worst. Glass that can sit over anything (palette, dialogs, map controls, compare tray) uses `--color-glass-strong` and the glass text tokens `--color-text-muted-glass` and `--color-link-glass`, and is checked over pure black and pure white, which bound every real backdrop. Text drawn straight on the textured page is checked against the worst texture pixel (the darkest in the light theme, the lightest in the dark theme). When a pair fails, a token changes, never the check: in phase 1 the texture lines were lowered to 8% and 10%, a glass-specific control-boundary token was added, and the dark strong glass became 86% opaque. The sidebar and top bar sit beside the scroll area, so page content never scrolls under them.

### Shell

At 1100 px and up, `Shell` renders a grid: sidebar (272 px, collapsible to a 72 px icon rail, state kept in `localStorage`) and a main column with the top bar and the page. Below 1100 px it renders today's header and bottom tabs, with the search icon added to the header.

One data model, `src/app/nav.ts`, lists groups and items with route, icon, label key, optional count source and optional Demo tag:
- Explore: Home, Find gyms, Saved (count)
- Plan: My week, Meals, Shopping list, Order food (Demo tag)
- Help: My reports, About the data, Data and privacy

Meals and Shopping list duplicate tabs inside My week. They stay as entry points as in the approved mockup. Revisit after use.

Sidebar footer: offline status, "Gym list from <date>", Install the app (hidden once installed).

Top bar: page title, the ⌘K widget, language, appearance, "Use my location". With the title-bar overlay, the bar sits in the title-bar area: empty space is a drag region, controls are not.

### Command palette

- Opens on ⌘K (Ctrl K on Windows and Linux, label adapts), on clicking the widget, and from the phone search icon. It works while typing in a field, and calls `preventDefault`.
- Radix Dialog with a combobox and listbox: `aria-activedescendant`, arrows move, Enter runs, Escape closes, focus returns to the opener.
- Desktop: centred glass panel. Phones: full-height solid sheet, no key hints.
- A command is `{ id, group, label, hint?, icon, keywords, when?(ctx), run(ctx) }` in a registry. Groups: Gyms and places (from `buildSuggestions`, including recents), Actions, Go to, Settings.
- Actions: Use my location, Add a missing gym, Set up my week, and on a gym page Report a problem, Save or unsave, Compare. Settings: switch language, appearance, Install the app.
- Empty query shows recents, then Actions, Go to, Settings. A query shows gyms and places first, then matching commands, at most eight per group. One exception: when a command matches the query strictly better than every gym or place (label starts with it, or a word in the label does, where the gym matches only loosely), the commands come first. Without it, typing an action in words such as "add a missing gym" fuzzy-matches gym names through its short words and Enter would open one. A tie keeps gyms first, so a plain "gym" still lists gyms.
- With a query the commands are ranked by match quality across groups, so typing "week" puts the My week page ahead of the Set up my week action. A blank query lists them by group.

### Hierarchy and accordions

A small `Accordion` built on `<details>`, so it works without JavaScript and is keyboard and screen-reader friendly. Rule for every screen: lead with the thing people do next, group by relationship, fold the rest.

- Home: hero with two actions and the ⌘K hint, county tiles (top eight, the rest folded), Today and Saved cards, "Good to know" accordions.
- Find gyms: title, a filter bar (one Filters button with a count plus the main chips), a compact search field above the list, list beside map with glass map controls.
- Gym profile: the owner's order stays (name and place, evidence, facilities, hours and price, contact and visit, first-visit questions, then sources and corrections; adopted 2026-11-14), with the sticky contact panel. Phase 3 restyles it with the new surfaces and keeps sources and corrections as a disclosure. "Not listed" stays visible for missing facts, as the honesty rule requires.
- My week: today's session card keeps its real behaviour: exercises are open for today and ticked per set, and the primary action stays "Mark session done". There is no new in-session mode. Then the food link and what is still to do. Set up, safety notes and the WHO link are folded.
- Order food: lead with suggestions; fold the plan text; the town picker folds under "Change town".
- Saved, Compare, Reports: same rules, done in phase 3.

### The Send button

`Button` gains `winLabel`, `iconEnd` and a `motion="fly"` option. Both labels sit in one grid cell so the width never changes. On hover (only where hover exists) the label swaps and the plane flies off the end, returns from the start and repeats until the pointer leaves. On touch the same motion plays once on press. The accessible name stays the stable label; the win label is `aria-hidden`. Reduced motion: text swap only, no loop. First use: "Send on WhatsApp" with the plane icon in the Report dialog. English hover text "Off it goes!". The app only opens WhatsApp and the person presses send there, so no label says "Sent".

### Real-app touches

- App icon: the icons today (`public/icons/`) are the old black and red barbell, not Signwriter. The owner chose a new Signwriter icon (a plate-dark rounded square with a signal-yellow bar, as in the mockup's sidebar logo) with a proper maskable version. It is a visible brand change, so the owner sees the icon before it ships. Phase 5.
- "Richer install card" means the browser's own install dialog, fed by manifest screenshots and a maskable icon. There is no in-app card. The unused install strings and helpers in `copy-en.ts`, `copy-sw.ts` and `storage.ts` are removed in phase 5.
- Manifest: `id`, `display_override: ["window-controls-overlay", "standalone"]`, `shortcuts` (Find gyms near me, Saved, My week), `categories`, `screenshots` (one wide, one narrow, generated from the live site and committed), a separate maskable icon with a safe zone, a theme colour per scheme.
- Install help: the sidebar and ⌘K install action use `usePwa().install`. On iPhone, where there is no prompt, a short dialog shows Share then Add to Home Screen.
- Title-bar CSS uses `env(titlebar-area-*)`.

## Phases

Each phase is one pull request, merged to `master`, deployed, and checked on the live site with screenshots, e2e and Lighthouse, and the ledger is updated.

1. Shell: tokens, glass, texture, nav model, sidebar, top bar, ⌘K palette, Accordion, the Send button in the Report dialog, contrast checks, tests.
2. Home and Find gyms hierarchy.
3. Gym profile, Saved, Compare, Reports.
4. My week and Order food.
5. Install polish: manifest, shortcuts, screenshots, maskable icon, iPhone help, title-bar overlay.

## Testing and quality bar

- Unit: nav model, command registry and ranking, shortcut label per platform, accordion, Button win labels and aria, palette keyboard behaviour.
- e2e (mobile and desktop): ⌘K opens, filters, runs, closes and returns focus; sidebar navigation and collapse; accordions; offline journey still passes; axe on the shell at 1440 and 390 px.
- `npm run contrast` covers glass pairs in light and dark.
- Lighthouse on the live site not lower than today; added JavaScript at most 25 KB gzipped.
- Screenshots at 1440 and 390 px, light and dark, compared with the mockup.

## Risks

- Blur cost on mid-range laptops: the gate and a `data-glass="off"` switch on the root element.
- Text over the texture: measured, not assumed.
- Ctrl K opens search in some browsers: `preventDefault` works in tabs and in the installed app.
- The title-bar overlay is Chromium on desktop only.
- Swahili strings for the new UI need a native reviewer.

## Left to the builder

Icon choices, exact pixel values, animation timing and easing, texture density, the collapse animation, and the order of rows inside each palette group, as long as they match the visual reference. "Compared with the mockup" means the owner reviews screenshots at 1440 and 390 px, light and dark, beside `docs/design/desktop-shell-mockup/shots/`. Pass means the same structure, spacing rhythm, visible glass and hierarchy; each deviation is listed in the pull request.
