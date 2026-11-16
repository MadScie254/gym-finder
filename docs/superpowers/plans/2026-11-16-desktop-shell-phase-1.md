# Desktop shell, glass and ⌘K: Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the app shell from the approved mockup: grouped sidebar and top bar with a ⌘K quick-actions modal on wide screens, frosted layers over a contour texture, an Accordion primitive, and the Send button's hover motion.

**Architecture:** One nav data model (`src/app/nav.ts`) feeds the sidebar and the palette. Glass is a gated CSS utility (`.glass`) driven by tokens, with a solid fallback. The palette is a lazy Radix Dialog over a pure command registry plus the existing `buildSuggestions`. The Send button is a CSS-only variant of `Button`.

**Tech Stack:** React 19, Vite 8, TypeScript strict, React Router 7, CSS modules, Radix Dialog (already a dependency), Vitest + jsdom, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-11-16-desktop-shell-design.md`. Visual reference: `docs/design/desktop-shell-mockup/` (screenshots in `shots/`). Where they differ, the spec wins.

## Global Constraints

- Layout: sidebar 272 px expanded, 72 px rail; top bar 56 px; both inset 12 px from the window edge. Sidebar from 1100 px up, expanded from 1280 px and a rail from 1100 to 1279 px until the person chooses (kept in `localStorage`). From 900 to 1099 px today's top-bar nav stays. Below 900 px the bottom tabs stay. `WIDE_QUERY` (900 px) is unchanged.
- Glass tokens, light: `--color-glass` `rgba(255,255,255,.56)`, `--color-glass-strong` `rgba(255,255,255,.74)`, `--color-glass-edge` `rgba(255,255,255,.92)`, `--glass-blur` `blur(22px) saturate(1.7)`, `--glass-blur-modal` `blur(30px) saturate(1.8)`, `--shadow-float` `0 12px 32px rgba(27,35,51,.12)`, `--shadow-modal` `0 28px 70px rgba(27,35,51,.30)`, `--radius-float` 16 px (palette 20 px). Dark values are chosen to pass the contrast script.
- Glass gate: `(min-width: 1100px) and (hover: hover) and (pointer: fine)` plus `@supports (backdrop-filter: blur(1px))`. Reduced transparency is an override block `@media (prefers-reduced-transparency: reduce)` after the gate, because a browser that lacks the feature would otherwise turn glass off for everyone. `:root[data-glass="off"]` is a kill switch. Outside the gate `.glass` is `--color-surface` with a hairline.
- Texture: two SVG masks from `scripts/contours.mjs`, at most 60,000 bytes together, committed in `src/ui/texture/`. Minor lines plate at .11, every fourth line cobalt at .26 (starting values, lowered if contrast fails). Phones show it at half opacity.
- Contrast minimums: text 4.5:1, large text 3:1, UI 3:1. Sidebar and top bar glass is checked over the page background with its darkest (light theme) or lightest (dark theme) texture pixel. Glass that sits over content (palette, dialogs, map controls, compare tray) uses `--color-glass-strong` and is checked over pure black and pure white using the glass text tokens `--color-text-muted-glass` and `--color-link-glass`. Text drawn on the textured page is checked against the worst texture pixel. When a pair fails, change the token, never the check.
- Palette: 700 px wide at 900 px and up, 7 vh from the top, 60 px search row, 48 px rows, at most 8 results per group. Below 900 px it is a full-height solid sheet with no key hints.
- Send button: label swap 0.26 s ease-out; plane loop 1.5 s, only while hovered where `(hover: hover)`; once on press otherwise; reduced motion means no loop and no transition. The accessible name stays the stable label. English hover text "Off it goes!".
- Copy: every new string in `copy-en.ts` and `copy-sw.ts` (Swahili stays draft); sentence case; no all-caps labels, gradients, appended arrows or numbered markers.
- No new runtime dependencies. Everything new that is built is covered by `scripts/precache.mjs` automatically; `e2e/offline.spec.ts` must keep passing.
- The existing 260 unit tests and 40 e2e tests keep passing. Entry JavaScript grows by at most 10 KB gzipped in this phase (the palette is lazy).
- Commit by explicit path, never `git add -A`. Every commit ends with the two trailer lines `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_012meetSaXTXdMNbcZ6Yxu99`.

## Review Focus

1. The shortcut pressed while focus is in a text field (it must still open the palette) and while another dialog is open, such as Report (it must be ignored). Tested in Task 6.
2. A palette query with no match, or only spaces: a clear empty message for no match, and the commands still listed for spaces. Tested in Tasks 5 and 6.
3. `localStorage` that throws or holds junk for the sidebar state: fall back to the width default, never crash. Tested in Task 7.
4. Kiswahili labels are longer: sidebar and palette rows must not overflow. Tested in Task 8.
5. Reduced motion, reduced transparency and devices with no hover: glass and the Send button degrade as specified. Tested in Tasks 2b and 4 with CSS contract tests.

## File structure

| File | Responsibility |
|---|---|
| `src/app/nav.ts` | Nav groups, current-entry rule, page title key |
| `src/app/Sidebar.tsx`, `TopBar.tsx` | Wide-screen chrome |
| `src/app/Shell.tsx` (+ `.module.css`) | Chooses sidebar, top or bottom chrome |
| `src/features/palette/shortcut.ts` | Platform label and key test |
| `src/features/palette/commands.ts` | Command registry and ranking (pure) |
| `src/features/palette/palette-context.tsx` | Open state, global shortcut, lazy host |
| `src/features/palette/CommandPalette.tsx` (+ `.module.css`) | The modal and sheet |
| `src/ui/Accordion.tsx` (+ `.module.css`) | Folded sections |
| `src/ui/Button.tsx`, `Button.module.css` | Send button variant |
| `src/ui/tokens.css`, `src/ui/base.css` | Tokens, `.glass`, texture |
| `scripts/contours.mjs`, `scripts/contrast.mjs` | Texture generator, glass contrast checks |

---

### Task 1: Nav model

**Files:**
- Create: `src/app/nav.ts`, `src/app/nav.test.ts`
- Modify: `src/lib/copy-en.ts`, `src/lib/copy-sw.ts`

**Interfaces:**
- Produces:
```ts
export type NavId = "home" | "find" | "saved" | "week" | "meals" | "shopping" | "order" | "reports" | "about" | "legal";
export type NavEntry = { id: NavId; to: string; labelKey: CopyKey; icon: LucideIcon; also?: readonly string[]; tag?: "demo"; count?: "saved" };
export type NavGroup = { id: "explore" | "plan" | "help"; labelKey: CopyKey; items: readonly NavEntry[] };
export const NAV_GROUPS: readonly NavGroup[];
export function currentEntry(pathname: string): NavEntry | null;   // longest matching prefix wins
export function pageTitleKey(pathname: string): CopyKey;           // entry label, else "brand"
```

- [ ] **Step 1: Write the failing tests in `src/app/nav.test.ts`.** Assert `NAV_GROUPS.map((g) => [g.id, g.items.map((i) => i.id)])` equals `[["explore",["home","find","saved"]],["plan",["week","meals","shopping","order"]],["help",["reports","about","legal"]]]`. Assert `currentEntry` ids for `/`→home, `/plan`→week, `/plan/setup`→week, `/plan/meals`→meals, `/plan/shopping`→shopping, `/fuel/basket`→order, `/gym/level-24-114c`→find, `/county/nairobi`→find, `/compare`→find, `/about/data`→about, `/legal`→legal, `/zzz`→null. Assert `pageTitleKey("/plan/meals") === "navMeals"` and `pageTitleKey("/zzz") === "brand"`. Assert only `order` has `tag: "demo"` and only `saved` has `count: "saved"`.
- [ ] **Step 2: Run** `npx vitest run src/app/nav.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `nav.ts`.** Routes: home `/`; find `/search` with `also` `["/in/","/county/","/near/","/gym/","/compare"]`; saved `/saved`; week `/plan`; meals `/plan/meals`; shopping `/plan/shopping`; order `/fuel`; reports `/reports`; about `/about/data`; legal `/legal`. Icons from lucide-react: House, Search, Bookmark, CalendarDays, Utensils, ListChecks, ShoppingBasket, Flag, Info, ShieldCheck. `currentEntry` uses the prefix rule of `isCurrent` in `src/ui/NavBar.tsx` and picks the longest matching prefix. New copy keys (EN / SW draft): `navGroupExplore` Explore / Gundua, `navGroupPlan` Plan / Panga, `navGroupHelp` Help / Msaada, `navMeals` Meals / Milo, `navShopping` Shopping list / Orodha ya ununuzi, `navOrder` Order food / Agiza chakula. Reuse `navHome`, `navFind`, `navSaved`, `navWeek`, `menuReports`, `menuAbout`, `menuLegal`.
- [ ] **Step 4: Run** the same command plus `npx vitest run src/lib/i18n.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(nav): one nav model for the sidebar and the palette` (add `src/app/nav.ts src/app/nav.test.ts src/lib/copy-en.ts src/lib/copy-sw.ts`).

---

### Task 2a: Glass tokens and contrast checks

**Files:**
- Modify: `src/ui/tokens.css` (light `:root`, the system dark block and the forced dark block; they must agree), `scripts/contrast.mjs`, `docs/superpowers/specs/2026-11-16-desktop-shell-design.md` (contrast paragraph)
- Create: `scripts/contrast.test.mjs`

**Interfaces:**
- Produces tokens: `--color-glass`, `--color-glass-strong`, `--color-glass-edge`, `--glass-blur`, `--glass-blur-modal`, `--shadow-float`, `--shadow-modal`, `--radius-float`, `--color-text-muted-glass`, `--color-link-glass`, `--color-texture-minor`, `--color-texture-major`. Starting light values for the last four: `#454d5e`, `#1a37b3`, `rgba(27,35,51,.11)`, `rgba(35,70,216,.26)`.

- [ ] **Step 1: Write the failing test `scripts/contrast.test.mjs`.** Run `node scripts/contrast.mjs --markdown` with `spawnSync`; assert exit status 0 and that stdout contains each new use name: "Sidebar and top bar text on glass", "Muted text on glass over content", "Links on glass over content", "Text on the textured page", "Muted text on the textured page".
- [ ] **Step 2: Run** `npx vitest run scripts/contrast.test.mjs`. Expected: FAIL, names absent.
- [ ] **Step 3: Add the tokens** to all three blocks of `tokens.css`. Dark: glass `rgba(37,46,66,.58)`, strong `rgba(37,46,66,.80)`, edge `rgba(242,244,247,.14)`, texture minor `rgba(242,244,247,.07)`, major `rgba(142,163,255,.16)`; shadows darker; pick the glass text tokens to pass.
- [ ] **Step 4: Extend `contrast.mjs`** with three groups, each producing rows in the same table as `PAIRS`: (a) texture glass: `text`, `text-muted`, `link` over `color-glass` composited on the worst texture pixel (candidates: `color-bg`, minor over bg, major over bg; take the lowest ratio per foreground), plus `focus` and `line-strong` as UI at 3:1; (b) content glass: `text`, `text-muted-glass`, `link-glass` over `color-glass-strong` composited on pure black and on pure white, the lower ratio wins; (c) text on the page: `text`, `text-muted`, `link` over `color-bg` with the worst texture pixel. Use the row names from Step 1.
- [ ] **Step 5: Run** `npm run contrast`. If a pair fails, change the token (alpha, text token or texture opacity) until it passes; record the final values in the commit message. Update the contrast paragraph in the spec to this refined rule. Re-run `npx vitest run scripts/contrast.test.mjs`. Expected: PASS.
- [ ] **Step 6: Commit** `feat(ui): glass and texture tokens with contrast checks` (add the four files).

---

### Task 2b: Texture and the `.glass` utility

**Files:**
- Create: `scripts/contours.mjs`, `scripts/contours.test.mjs`, `src/ui/texture/contours-minor.svg`, `src/ui/texture/contours-major.svg`, `src/ui/css-contract.test.ts`
- Modify: `src/ui/base.css`, `package.json` (script `"texture": "node scripts/contours.mjs"`)

**Interfaces:**
- Produces: `export function generateContours(): { minor: string; major: string }` (deterministic SVG text, viewBox `0 0 1920 1200`, opaque black strokes used as masks); the global class `.glass` with optional `data-strength="strong"`.

- [ ] **Step 1: Write the failing tests.** `contours.test.mjs`: two calls to `generateContours()` are equal; `minor.length + major.length <= 60000`; both start with `<svg` and contain `<path`; the committed files equal the generator output. `css-contract.test.ts` reads `base.css` and asserts: it references `./texture/contours-minor.svg` and `./texture/contours-major.svg` and both files exist; every `backdrop-filter` occurrence comes after the text `@media (min-width: 1100px) and (hover: hover) and (pointer: fine)`; a `@media (prefers-reduced-transparency: reduce)` block exists after that gate; `:root[data-glass="off"] .glass` exists; `.glass` outside the gate has `background: var(--color-surface)`; a `@media print` rule hides the texture.
- [ ] **Step 2: Run** `npx vitest run scripts/contours.test.mjs src/ui/css-contract.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `generateContours`.** Value noise with warped coordinates, marching squares on a 24 px cell, 18 levels (every fourth level goes to `major`), segments chained into polylines, integer coordinates, one `<path>` per file. Port the approach from `docs/design/desktop-shell-mockup/contours.cjs` and tune density until the pair is under the byte budget. The CLI writes the two files; run `npm run texture`.
- [ ] **Step 4: Implement CSS in `base.css`.** `body::before` and `body::after`: fixed, inset 0, `z-index: -1`, `pointer-events: none`, `mask: url(./texture/contours-minor.svg) center / cover no-repeat` (and `-webkit-mask`), background `var(--color-texture-minor)`; `::after` uses the major file and `--color-texture-major`; opacity .5 below 1100 px; hidden in print. Add `.glass` and `.glass[data-strength="strong"]` exactly as in Global Constraints (solid base, gate, `@supports`, reduced-transparency override, kill switch). Modal blur uses `--glass-blur-modal`.
- [ ] **Step 5: Run** the Step 2 command and `npm run contrast`. Expected: PASS. If text on the texture fails, lower the texture opacity tokens from Task 2a and re-run both.
- [ ] **Step 6: Commit** `feat(ui): contour texture and the gated glass utility` (add the new files, `base.css`, `package.json`, and `tokens.css` if touched).

---

### Task 3: Accordion

**Files:**
- Create: `src/ui/Accordion.tsx`, `src/ui/Accordion.module.css`, `src/ui/Accordion.test.tsx`
- Modify: `src/ui/index.ts`, `src/features/styleguide/ControlsSection.tsx` (add a sample)

**Interfaces:**
- Produces:
```ts
export function Accordion(props: { children: ReactNode }): JSX.Element;   // the bordered group
export function AccordionItem(props: { title: ReactNode; icon?: LucideIcon; defaultOpen?: boolean; children: ReactNode }): JSX.Element; // <details><summary>
```

- [ ] **Step 1: Write the failing test `Accordion.test.tsx`** (jsdom, same pattern as `Chip.test.tsx`): closed by default (`details.open === false`); `defaultOpen` sets `open`; clicking the `summary` opens it; the title is the summary's accessible name; the chevron and the optional icon are `aria-hidden`; items inside one `Accordion` are independent.
- [ ] **Step 2: Run** `npx vitest run src/ui/Accordion.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** with native `<details>`/`<summary>`: 52 px rows, hairline separators, chevron rotates with `details[open]`, body indented under the title, visible focus ring from tokens, no JavaScript state. Export from `src/ui/index.ts`; add one sample to the styleguide.
- [ ] **Step 4: Run** the test, `npx eslint src/ui/Accordion.tsx` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): Accordion on native details`.

---

### Task 4: The Send button

**Files:**
- Modify: `src/ui/Button.tsx`, `src/ui/Button.module.css`, `src/ui/Button.test.tsx`, `src/features/report/ReportDialog.tsx`, `src/lib/copy-en.ts`, `src/lib/copy-sw.ts`
- Create: `src/ui/button-css.test.ts`

**Interfaces:**
- Consumes: the existing `Button` (button and link variants).
- Produces: new optional props on both variants: `winLabel?: string`, `iconEnd?: boolean`, `motion?: "fly"`. New copy key `reportSendWin`: EN `Off it goes!`, SW `Inaenda!`.

- [ ] **Step 1: Write the failing tests.** In `Button.test.tsx`: with `winLabel`, `getByRole("button", { name: "Send on WhatsApp" })` still finds it; the win label element has `aria-hidden="true"`; with `iconEnd` the icon follows the label in DOM order; the link variant (with `href`) renders both labels too. In `button-css.test.ts` (reads `Button.module.css` text): the label swap and plane animation sit inside `@media (hover: hover)`; a `@media (prefers-reduced-motion: reduce)` block sets `animation: none` and `transition: none`; a `:active` rule under `@media (hover: none)` plays the animation once (`animation-iteration-count: 1`).
- [ ] **Step 2: Run** `npx vitest run src/ui/Button.test.tsx src/ui/button-css.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** With `winLabel`, render both labels in one grid cell so the width never changes (first label stable, second `aria-hidden`), the icon in a clipped box; keyframes and timings from Global Constraints (leave up and right by 30 px and 26 px fading to 38%, reappear down and left at 39%, settle by 72%, repeat). In `ReportDialog.tsx` change the "Send on WhatsApp" button to `icon={Send} iconEnd motion="fly" winLabel={tr("reportSendWin")}`; keep its `href`, `target` and `rel`.
- [ ] **Step 4: Run** the Step 2 command and `npx vitest run src/features/report src/lib/i18n.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): Send button with a hover win text and a looping plane`.

---

### Task 5: Shortcut and command registry (pure logic)

**Files:**
- Create: `src/features/palette/shortcut.ts`, `shortcut.test.ts`, `commands.ts`, `commands.test.ts`
- Modify: `src/lib/copy-en.ts`, `src/lib/copy-sw.ts`

**Interfaces:**
- Consumes: `NAV_GROUPS` (Task 1); `Venue`, `IssueKind` (`"wrong_details" | "closed" | "duplicate" | "add_gym" | "claim" | "other"`), `Translate`, `Lang`, `ThemeChoice`.
- Produces:
```ts
export function isApplePlatform(nav?: Pick<Navigator, "platform" | "userAgent">): boolean;
export function shortcutLabel(apple?: boolean): string;   // "⌘K" | "Ctrl K"
export function isPaletteShortcut(e: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">): boolean;
export type CommandGroup = "actions" | "go" | "settings";
export type Command = { id: string; group: CommandGroup; label: string; hint?: string; icon: LucideIcon; keywords: readonly string[]; run: () => void };
export type CommandContext = {
  tr: Translate; lang: Lang; theme: ThemeChoice; venue: Venue | null; saved: boolean; savedCount: number; canInstall: boolean;
  go: (to: string) => void; locate: () => void; setLang: (l: Lang) => void; cycleTheme: () => void; install: () => void;
  openReport: (kind: IssueKind, venue: Venue | null) => void; toggleSaved: (venue: Venue) => void;
};
export function buildCommands(ctx: CommandContext): Command[];
export function rankCommands(commands: readonly Command[], query: string, perGroup?: number): Command[]; // default 8
```
New copy keys: `paletteLocate` (Use my location), `paletteLocateHint` (Sort by distance), `paletteSetupWeek` (Set up my week), `paletteReportGym` (Report a problem with this gym), `paletteSave` (Save this gym), `paletteUnsave` (Remove from saved), `paletteSwitchLang` (`Switch to {language}`), `paletteTheme` (`Appearance: {theme}`), `paletteSavedHint` (`{n} saved`). Reuse `menuAddGym`, `menuInstall`, the `theme_*` keys and the nav label keys.

- [ ] **Step 1: Write the failing tests.** `shortcut.test.ts`: label is `⌘K` for an Apple platform and `Ctrl K` otherwise; `isPaletteShortcut` is true for meta+k and ctrl+k in either case and false with alt or shift, and for other keys. `commands.test.ts` (use `t("en", …)` as `tr`): group order is actions, go, settings; `go` has one command per `NAV_GROUPS` entry in order; `Report a problem with this gym` and the save command exist only when `venue` is set, and the save label follows `saved`; the install command exists only when `canInstall`; running commands calls the right context function (`go("/plan/setup")` for set up my week, `setLang("sw")` when `lang` is `"en"` and `setLang("en")` when it is `"sw"`, `openReport("wrong_details", venue)`, `cycleTheme`); `rankCommands`: `""` keeps group order, `"kiswa"` puts the language command first, `"week"` returns My week and Set up my week, `"   "` behaves like `""`, `"zzzzzz"` returns `[]`, and `perGroup` caps each group.
- [ ] **Step 2: Run** `npx vitest run src/features/palette`. Expected: FAIL.
- [ ] **Step 3: Implement.** `isApplePlatform` reads `navigator.platform` then `userAgent` (Mac, iPhone, iPad). `rankCommands` folds case and accents (`foldPlace` from `src/lib/filterVenues.ts`), scores label starts-with 3, word-start 2, contains or keyword 1, keeps stable order, drops score 0, applies `perGroup`. Icons: MapPin or LocateFixed for locate, FilePlus, CalendarDays, Flag, Bookmark, Languages, Moon, Download.
- [ ] **Step 4: Run** the Step 2 command and `npx vitest run src/lib/i18n.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(palette): shortcut and command registry`.

---

### Task 6: The command palette

**Files:**
- Create: `src/features/palette/palette-context.tsx`, `CommandPalette.tsx`, `Palette.module.css`, `CommandPalette.test.tsx`
- Modify: `src/app/App.tsx` (wrap `<Routes>` in `PaletteProvider`, inside `ReportProvider`), `src/lib/copy-en.ts`, `src/lib/copy-sw.ts`

**Interfaces:**
- Consumes: Task 5; `buildSuggestions` and `SuggestionGroup` from `src/lib/searchModel.ts`; `loadLandmarks`; `loadRecentSearches`, `saveRecentSearch`, `loadTheme`, `applyTheme` from `src/lib/storage.ts`; `useVenueContext`, `useT`, `useSaved`, `useReport`, `usePwa`.
- Produces:
```ts
export type PaletteValue = { open: boolean; show: () => void; hide: () => void };
export function PaletteProvider(props: { children: ReactNode }): JSX.Element; // global shortcut, lazy host
export function usePalette(): PaletteValue;
export default function CommandPalette(props: { onClose: () => void }): JSX.Element; // lazy chunk
```
New copy keys: `paletteTitle` (Quick actions), `palettePlaceholder` (Search gyms, places or type an action), `paletteWidget` (Search gyms, places, actions), `paletteEmpty` (Nothing matches. Try a gym, a town or a page name.), `paletteSearchAll` (`Search all gyms for “{q}”`), `paletteHintMove`, `paletteHintOpen`, `paletteHintClose`, `paletteGroupActions`, `paletteGroupGo`, `paletteGroupSettings`.

- [ ] **Step 1: Write the failing tests `CommandPalette.test.tsx`** (jsdom; mock `venue-context`, `report-store` and `pwa` as `Shell.test.tsx` does; wrap in `StoreProvider` and `MemoryRouter`; build the index from the real catalogue as `src/lib/results.test.ts` does; spy on `navigate` via a route probe). Cases: opens on Ctrl+K and on Meta+K and closes on Escape with focus back on the previously focused button; typing `slaute` lists `Salute Gym` first and Enter goes to its `/gym/salute-gym-` page and records the recent search; typing `week` and Enter goes to `/plan`; ArrowDown moves `aria-activedescendant`; `zzzzzz` shows `paletteEmpty` in a `role="status"`; spaces only still lists the Actions group; the shortcut works while an `<input>` has focus; the shortcut is ignored while a Radix `Dialog` is open; below 900 px the modal has the sheet variant (`data-variant="sheet"`).
- [ ] **Step 2: Run** `npx vitest run src/features/palette/CommandPalette.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement the provider.** One `window` `keydown` listener using `isPaletteShortcut`; `preventDefault`; ignore when a `[role="dialog"][data-state="open"]` other than the palette exists; the host is `React.lazy(() => import("./CommandPalette"))` rendered only when open.
- [ ] **Step 4: Implement the modal.** Radix `Dialog` (title visually hidden). Input `role="combobox"` with `aria-controls`, `aria-expanded` and `aria-activedescendant`; list `role="listbox"` with `role="group"` sections and `role="option"` rows; first row highlighted by default; ArrowUp and ArrowDown wrap; Enter and click run the row then close. Rows: suggestion groups from `buildSuggestions` first (with `saveRecentSearch` on run), then `rankCommands(buildCommands(ctx), query)`, plus a final action row `paletteSearchAll` going to `/search` with the query when the query is non-empty (build the URL as `GymSearch` does). Desktop layout, sizes and glass strength from Global Constraints; below 900 px a full-height solid sheet with `data-variant="sheet"` and no hint footer.
- [ ] **Step 4a: Wire** `PaletteProvider` in `App.tsx`; the theme command cycles system, light, dark through `applyTheme`.
- [ ] **Step 5: Run** the Step 2 command, then `npx vitest run src/app src/features/palette` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Commit** `feat(palette): ⌘K quick-actions modal`.

---

### Task 7: Sidebar, top bar and shell modes

**Files:**
- Create: `src/app/Sidebar.tsx`, `src/app/TopBar.tsx`, `src/app/Sidebar.test.tsx`
- Modify: `src/app/Shell.tsx`, `src/app/Shell.module.css`, `src/app/Shell.test.tsx`, `src/app/useMediaQuery.ts`, `src/lib/storage.ts`, `src/lib/storage.test.ts` (create if absent), `src/lib/copy-en.ts`, `src/lib/copy-sw.ts`

**Interfaces:**
- Produces: `export const SIDEBAR_QUERY = "(min-width: 1100px)"` and `export const SIDEBAR_EXPANDED_QUERY = "(min-width: 1280px)"` in `useMediaQuery.ts`; in `storage.ts` `loadSidebarCollapsed(): boolean | null` (null means no choice yet) and `saveSidebarCollapsed(collapsed: boolean): void`, both safe when storage throws or holds junk; `Sidebar(props: { collapsed: boolean; onToggle: () => void })`; `TopBar()`.
- New copy keys: `sidebarCollapse`, `sidebarExpand`, `offlineReady` (Works offline), `gymListFrom` (`Gym list from {date}`), `searchOpen` (Search).

- [ ] **Step 1: Write the failing tests.** `storage.test.ts`: `loadSidebarCollapsed()` is null on empty storage, round-trips `true` and `false`, returns null for junk such as `"maybe"`, and does not throw when `localStorage.getItem` and `setItem` throw. `Sidebar.test.tsx`: renders the three group labels and ten entries in order with their icons; the current entry has `aria-current="page"` and others do not (so My week and Meals are never both current); the Saved entry shows the saved count; Order food shows the Demo tag; the collapse button toggles `aria-expanded` and calls `onToggle`; a collapsed sidebar keeps every entry reachable by accessible name. `Shell.test.tsx`: with a `matchMedia` stub that matches the sidebar query, the shell renders the sidebar and the top bar with the ⌘K widget and no bottom nav; between 900 and 1099 px it renders today's top nav plus a header Search button; below 900 px it renders the bottom nav plus the header Search button; pressing the widget calls `usePalette().show`.
- [ ] **Step 2: Run** `npx vitest run src/app src/lib/storage.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement storage and the media queries.**
- [ ] **Step 4: Implement `Sidebar`.** Groups from `NAV_GROUPS` with labels from `tr`; rows 40 px; active row uses the cobalt 9% fill and 3 px bar; count chip from `useSaved().entries.length`; footer shows the offline status (`offlineReady` only when `navigator.serviceWorker?.controller` exists, otherwise the offline banner text when offline, otherwise nothing), `gymListFrom` with `formatDate(lang, index.manifest.builtAt)`, and the Install button only when `usePwa().canInstall`. Glass via `className="glass"`, 12 px inset, 16 px radius, widths from Global Constraints.
- [ ] **Step 5: Implement `TopBar`.** Page title from `pageTitleKey(pathname)`; a search widget button (search icon, `paletteWidget` text, `shortcutLabel()` chip) calling `usePalette().show`; a language button (shows the current language, toggles it); an appearance button (cycles the theme); a locate button calling `locate()`. `className="glass"`.
- [ ] **Step 6: Rework `Shell.tsx`.** Three modes from `useMediaQuery(SIDEBAR_QUERY)` and `useMediaQuery(WIDE_QUERY)`: sidebar mode renders `Sidebar` and `TopBar` in a two-column grid and no bottom nav; top mode and bottom mode keep today's header and bottom tabs and add an `IconButton` Search (label `searchOpen`) before the menu. The compare tray, banners and `Outlet` stay. Initial collapsed state is `loadSidebarCollapsed() ?? !matches(SIDEBAR_EXPANDED_QUERY)`; toggling saves it. The sidebar and top bar sit beside the scroll area, never over it.
- [ ] **Step 7: Run** `npx vitest run src/app src/lib/storage.test.ts src/features`, `npm run typecheck`, `npx eslint src/app src/features/palette src/lib/storage.ts`. Expected: PASS.
- [ ] **Step 8: Commit** `feat(shell): grouped sidebar and top bar with the ⌘K widget`.

---

### Task 8: End to end, docs and the preview

**Files:**
- Create: `e2e/shell.spec.ts`
- Modify: any existing spec the shell breaks (selectors only), `docs/PROGRESS.md`, `docs/DECISIONS.md`, `docs/superpowers/specs/2026-11-16-desktop-shell-design.md` (record: the owner chose a new Signwriter app icon, shown before it ships)

- [ ] **Step 1: Write `e2e/shell.spec.ts`.** Desktop project: the sidebar shows Explore, Plan and Help with their entries; clicking Find gyms navigates and marks it current; `Control+K` opens the palette, typing `slaute` shows Salute Gym, Enter lands on `/gym/salute-gym-…` with an h1 "Salute Gym", Escape on a fresh open closes it and focus returns to the widget; axe finds no violations on `/` and on `/search` with the palette open. Mobile project: the header Search button opens the sheet, Cancel or Escape closes it, bottom tabs are present and there is no sidebar. Both projects: switch to Kiswahili from the language button and assert no sidebar entry or palette row has `scrollWidth > clientWidth`.
- [ ] **Step 2: Run** `npm run e2e`. Fix only selectors in existing specs that the new chrome breaks; do not change what they assert. Expected: all pass.
- [ ] **Step 3: Check the budgets.** Build `master` in a temporary worktree (`git worktree add /tmp/fmg-master origin/master`, then `npm ci && npm run build` there) and the branch; sum the gzipped size of `dist/assets/index-*.js` in each and require growth of at most 10 KB. Remove the worktree. Run `npm run check`.
- [ ] **Step 4: Update docs.** `docs/PROGRESS.md` (phase 1 status, checks, what is next), one dated line in `docs/DECISIONS.md` for the shell, the glass gate and the icon choice; the spec records the icon decision.
- [ ] **Step 5: Commit** `test(e2e): shell journeys; docs: phase 1 status`, push the branch, and mark pull request 12 ready for review with the phase 1 summary.
- [ ] **Step 6: Verify on the Vercel preview** of the branch: open `/`, `/search`, a gym page and the palette at 1440 and 390 px (light and dark) with Playwright, take screenshots, run Lighthouse on the preview, and send the screenshots to the owner. Do not merge until the owner has seen them and says to go.

---

## Self-review

**Spec coverage.** Tokens, glass, texture, contrast: Tasks 2a and 2b. Nav model, sidebar, top bar, collapse, offline and install footer: Tasks 1 and 7. Palette with four groups, recents, context commands, phone sheet, shortcut label: Tasks 5 and 6. Accordion: Task 3. Send button and copy: Task 4. Tests, e2e, axe, Lighthouse, bundle budget, screenshots: Task 8. Deliberately later: Home and Find gyms layout (phase 2), profile, Saved, Compare, Reports (3), My week and Order food (4), manifest, shortcuts, screenshots, icon, iPhone help and title-bar overlay (5). The sidebar's Install button is in phase 1; the install dialog polish is phase 5.

**Step scan.** Each step names the files, signatures, values and the command that proves it. No step says "handle edge cases".

**Type consistency.** `NavEntry`, `NavGroup` and `currentEntry` (Task 1) are used unchanged in Tasks 5, 6 and 7. `Command`, `CommandContext`, `buildCommands`, `rankCommands` (Task 5) are used unchanged in Task 6. `PaletteValue` and `usePalette` (Task 6) are used in Task 7. `SIDEBAR_QUERY` and `SIDEBAR_EXPANDED_QUERY` are defined and used in Task 7 only.

**Review Focus.** Each of the five lines has a test in the task named on it.

**Proportion.** About twice the spec's length, mostly tests and signatures; no function bodies.
