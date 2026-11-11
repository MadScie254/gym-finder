# Signwriter design system

The look of Find My Gym, from `docs/REVAMP_PLAN.md` section 3. Kenyan gyms announce
themselves with hand-painted signs: enamel blue, road-marking yellow, white block
letters. Inside there are iron plates and kilogram numerals. The system borrows
that, and nothing from the wellness-app look.

- Tokens: `src/ui/tokens.css` (light, dark by `prefers-color-scheme`, and a forced
  `data-theme="dark"` / `"light"` on `<html>`).
- Font, reset, focus ring: `src/ui/base.css`.
- Components: `src/ui/*.tsx`, one CSS module each, one test file each.
- Review page: `/styleguide`, in `npm run dev` and in the e2e build only
  (`vite build --mode e2e`). Production builds drop it.

## Colour

Components use the semantic `--color-*` names only. Raw names follow the plan.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-bg` | `#F2F4F7` chalk | `#1B2333` | Page |
| `--color-surface` | `#FFFFFF` white enamel | `#252E42` | Cards, sheets, menus |
| `--color-sunk` | `#E7EAF0` | `#131A28` | Badge wells, skeletons, pressed toggles |
| `--color-text` | `#1B2333` plate | `#F2F4F7` | Text |
| `--color-text-muted` | `#5A6477` slate | `#A9B2C3` | Secondary text |
| `--color-action` | `#2346D8` cobalt | `#6F8BFF` | Primary buttons |
| `--color-action-hover` | `#1A37B3` | `#91A6FF` | Primary hover |
| `--color-on-action` | `#FFFFFF` | `#10172A` | Label on primary |
| `--color-link` | `#2346D8` | `#8EA3FF` | Links, quiet buttons |
| `--color-highlight` | `#FFC42E` signal | `#FFC42E` | Open now, active filter. One per screen. |
| `--color-on-highlight` | `#1B2333` | `#1B2333` | Always plate on signal |
| `--color-plate` | `#1B2333` | `#0D1220` | Distance block |
| `--color-on-plate` | `#F2F4F7` | `#F2F4F7` | Numerals on the block |
| `--color-plate-muted` | `#B5BDCC` | `#A9B2C3` | Unit and caption on the block |
| `--color-plate-edge` | `#1B2333` | `#7D889D` | Block edge (needed in dark) |
| `--color-inverse` / `--color-on-inverse` | plate / chalk | chalk / plate | Offline banner |
| `--color-ok` | `#0A7A51` court | `#3FBF86` | Verified, open |
| `--color-danger` | `#C43420` stop | `#FF7B6B` | Closed, errors. Never decoration. |
| `--color-line` | plate 10% | chalk 12% | Card hairlines (decorative) |
| `--color-line-strong` | `#838C9C` | `#7D889D` | Chip, field and button edges |
| `--color-focus` | `#2346D8` | `#8EA3FF` | Focus ring, 3 px, 2 px offset |

### Changes from the plan's starting values

Measured with `scripts/contrast.mjs` (WCAG 2.2 relative luminance).

| Token | Plan | Final | Why |
|---|---|---|---|
| `court` | `#0C8558` | `#0A7A51` | 4.22:1 on chalk, under 4.5:1 for "Open" and "Verified" words |
| `stop` | `#D23A2A` | `#C43420` | 4.35:1 on chalk, under 4.5:1 for error text |
| dark distance block | plate on plate | `#0D1220` with a `#7D889D` edge | The block vanished on dark cards (1.38:1) |

Slate `#5A6477`, cobalt `#2346D8`, signal `#FFC42E`, chalk and plate pass as given.
`--color-line` is decorative (cards are identified by their content), so it is not
held to 3:1; every control boundary uses `--color-line-strong`, which is.

### Contrast table

`npm run contrast` checks every pair below and fails the build (`npm run check`)
if any drops under its minimum. Regenerate this table with
`node scripts/contrast.mjs --markdown`.

| Use | Foreground | Background | Min | Light | Dark |
|---|---|---|---|---|---|
| Body text on page | `--color-text` | `--color-bg` | 4.5:1 | 14.28:1 | 14.28:1 |
| Body text on cards and sheets | `--color-text` | `--color-surface` | 4.5:1 | 15.73:1 | 12.31:1 |
| Text on sunk wells (badges, skeleton) | `--color-text` | `--color-sunk` | 4.5:1 | 13.05:1 | 15.80:1 |
| Secondary text on page | `--color-text-muted` | `--color-bg` | 4.5:1 | 5.41:1 | 7.37:1 |
| Secondary text on cards | `--color-text-muted` | `--color-surface` | 4.5:1 | 5.96:1 | 6.36:1 |
| Secondary text on sunk wells | `--color-text-muted` | `--color-sunk` | 4.5:1 | 4.94:1 | 8.16:1 |
| Links on page | `--color-link` | `--color-bg` | 4.5:1 | 6.48:1 | 6.62:1 |
| Links and quiet buttons on cards | `--color-link` | `--color-surface` | 4.5:1 | 7.15:1 | 5.71:1 |
| Primary button label | `--color-on-action` | `--color-action` | 4.5:1 | 7.15:1 | 5.78:1 |
| Primary button label, hover | `--color-on-action` | `--color-action-hover` | 4.5:1 | 9.37:1 | 7.73:1 |
| Open distance block, active chip | `--color-on-highlight` | `--color-highlight` | 4.5:1 | 9.88:1 | 9.88:1 |
| Distance numerals on plate | `--color-on-plate` | `--color-plate` | 4.5:1 | 14.28:1 | 16.95:1 |
| Unit and caption on plate | `--color-plate-muted` | `--color-plate` | 4.5:1 | 8.33:1 | 8.75:1 |
| Offline banner | `--color-on-inverse` | `--color-inverse` | 4.5:1 | 14.28:1 | 14.28:1 |
| Open and verified wording on cards | `--color-ok` | `--color-surface` | 4.5:1 | 5.36:1 | 5.82:1 |
| Open and verified wording on page | `--color-ok` | `--color-bg` | 4.5:1 | 4.87:1 | 6.75:1 |
| Closed and error wording on cards | `--color-danger` | `--color-surface` | 4.5:1 | 5.44:1 | 5.36:1 |
| Error wording on page | `--color-danger` | `--color-bg` | 4.5:1 | 4.94:1 | 6.22:1 |
| Control boundary on page (chips, inputs) | `--color-line-strong` | `--color-bg` | 3:1 | 3.08:1 | 4.41:1 |
| Control boundary on cards | `--color-line-strong` | `--color-surface` | 3:1 | 3.39:1 | 3.80:1 |
| Focus ring on page | `--color-focus` | `--color-bg` | 3:1 | 6.48:1 | 6.62:1 |
| Focus ring on cards | `--color-focus` | `--color-surface` | 3:1 | 7.15:1 | 5.71:1 |
| Primary button edge on cards | `--color-action` | `--color-surface` | 3:1 | 7.15:1 | 4.40:1 |
| Primary button edge on page | `--color-action` | `--color-bg` | 3:1 | 6.48:1 | 5.10:1 |
| Distance block edge on cards | `--color-plate-edge` | `--color-surface` | 3:1 | 15.73:1 | 3.80:1 |
| Distance block edge on page | `--color-plate-edge` | `--color-bg` | 3:1 | 14.28:1 | 4.41:1 |
| Active chip border on signal | `--color-on-highlight` | `--color-highlight` | 3:1 | 9.88:1 | 9.88:1 |
| Verified roundel | `--color-tier-verified` | `--color-surface` | 3:1 | 5.36:1 | 5.82:1 |
| Corroborated rings | `--color-tier-corroborated` | `--color-surface` | 3:1 | 7.15:1 | 5.71:1 |
| Listed ring | `--color-tier-listed` | `--color-surface` | 3:1 | 5.96:1 | 6.36:1 |
| Unconfirmed dashed ring | `--color-tier-unconfirmed` | `--color-surface` | 3:1 | 5.96:1 | 6.36:1 |
| Verified roundel on sunk well | `--color-tier-verified` | `--color-sunk` | 3:1 | 4.45:1 | 7.47:1 |
| Corroborated rings on sunk well | `--color-tier-corroborated` | `--color-sunk` | 3:1 | 5.93:1 | 7.32:1 |
| Listed ring on sunk well | `--color-tier-listed` | `--color-sunk` | 3:1 | 4.94:1 | 8.16:1 |

## Type

One family, Archivo, one variable file with width and weight axes.

- Source: `@fontsource-variable/archivo` 5.3.0 (`wdth.css`, latin subset). The
  package does ship the width axis: `font-stretch: 62% 125%`, `wght` 100 to 900.
- That latin file is 90,104 bytes. The system only uses width 75 to 100 and weight
  400 to 800, so `scripts/instance-font.mjs` limits the axes with fontTools.
  Result: `src/ui/fonts/archivo-signwriter.woff2`, **57,776 bytes (56.4 KiB)**,
  the whole font payload. Tabular figures (`tnum`) survive. Regenerate with
  `pip install fonttools brotli && node scripts/instance-font.mjs`.
- `font-display: swap`, latin `unicode-range`, self-hosted (CSP `font-src 'self'`).

| Role | Width | Weight | Notes |
|---|---|---|---|
| Headings, gym names (`--font-width-sign`) | 78% | 760 | Tight tracking, `text-wrap: balance` |
| Numerals (`--font-width-numeral`) | 75% | 800 | `tabular-nums`; distance, time, price |
| Body and UI | 100% | 400 to 640 | 16 px minimum on mobile |

Scale (px): 12, 14, 16, 18, 22, 28, 38, 52, as `--font-size-*` in rem.
Sentence case everywhere. No all-caps labels, no eyebrow text, no monospace.

## Shape, depth, motion

- Radius by role: 4 px tags, chips, badges and the distance block; 6 px buttons
  and fields; 10 px cards; 20 px sheet top corners.
- Cards: 1 px hairline, no shadow. Only sheets and menus cast a shadow.
- Motion: 120 ms for control feedback, 180 ms for sheets and dialogs. All motion is
  cut by `prefers-reduced-motion` in `base.css`.
- Focus: 3 px `--color-focus` outline, 2 px offset, on every interactive element.
  A row that scrolls sideways must pad at least 5 px or it clips the ring.

## Components

| Component | File | Notes |
|---|---|---|
| Button | `Button.tsx` | primary, secondary, quiet; optional Lucide icon; renders `<a>` when given `href`; `buttonClassName()` styles a router `<Link>` |
| IconButton | `IconButton.tsx` | Required `label` (aria-label and tooltip); `pressed` for toggles |
| Chip | `Chip.tsx` | Toggle with `aria-pressed`, count in tabular numerals, tick when on, dashed when disabled |
| TrustBadge | `TrustBadge.tsx` | Verified filled roundel with tick, Corroborated double ring, Listed single ring, Unconfirmed dashed ring. Shape, mark and word, never colour alone |
| DistanceBlock | `DistanceBlock.tsx` | The signature element. Plate block, condensed tabular numerals, signal yellow with plate text when `open`. Spoken as "1.2 kilometres away in a straight line" |
| GymCard | `GymCard.tsx` | Name links the whole top row; actions sit outside the link; `selected` adds a cobalt edge and `aria-current`; `renderLink` for router links; `level` for the heading |
| ActionRow | `ActionRow.tsx` | One 44 px row, first action primary. In a narrow container the others shrink to icons and keep their names (container queries) |
| Sheet | `Sheet.tsx` | Hand-rolled. Peek, half, full. Drag or tap the handle, arrow keys, Home and End. A labelled region, not a modal. Focus landing in a peeking sheet opens it to half |
| NavBar | `NavBar.tsx` | Gyms, Fuel, Plan, Saved. Bottom bar or top rail. Current page: plate bar plus weight |
| SearchField | `SearchField.tsx` | ARIA 1.2 combobox, grouped listbox, `aria-activedescendant`, Escape closes then clears, status line for no matches |
| Skeleton | `Skeleton.tsx` | `Skeleton`, `GymCardSkeleton`, `SkeletonList` (one spoken "Loading gyms") |
| Banner | `Banner.tsx` | offline (inverse), update (cobalt, one action), demo (dashed, carries DemoTag) |
| EmptyState | `EmptyState.tsx` | The only centred layout. Plate-face ring icon, title, next step |
| DemoTag | `DemoTag.tsx` | Dashed "Demo" stencil for simulated content (plan 2.1). Never on gym data |
| Dialog | `Dialog.tsx` | Radix Dialog. Bottom sheet on phones, centred card from 640 px |
| Popover | `Popover.tsx` | Radix Popover, for short explanations such as why a gym has its tier |

Icons: `lucide-react`, decorative (`aria-hidden`); the label names the action.

## Review checklist (plan section 3.6)

No cream or beige, no terracotta, vermilion or acid green, no serif display, no
gradients, no identical soft-shadow cards, no all-caps tracked labels, no
"A · B · C" strings (use commas), no arrows in button text, no numbered markers,
no stock photos, no emoji icons, no spinner where a skeleton fits.

## Known gaps

- The product screens (Explore, Detail, Fuel, Plan) still use the legacy
  `src/styles.css`, now mapped onto these tokens. They are rebuilt on `src/ui`
  in Phase 4.
- The design was not built in Figma first (plan 3.7). The styleguide stands in
  for owner review.
- Map pins (plate face, cluster stack) belong to `MapPane` and are not restyled yet.
