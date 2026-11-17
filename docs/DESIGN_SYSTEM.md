# Jioni design system

The look of Find My Gym. *Jioni* is Kiswahili for evening: the blue-violet sky over Nairobi at dusk, the hour
most people train. One brand colour, pushed far enough towards violet to be ownable, on a white light theme and a
true-black dark theme. Everything else is quiet so the colour, the numerals and the home film carry the brand.

Tokens live in `src/ui/tokens.css`. Components use the semantic `--color-*` names only. Contrast for every pair is
checked by `npm run contrast` (`scripts/contrast.mjs`).

## Colour

Raw palette (fixed, theme-independent; the number plates use these directly so a plate is the same object in both
themes):

| Name | Hex | Role |
| --- | --- | --- |
| Jioni | `#3a1fe6` | Brand and primary action, light theme |
| Jioni deep | `#2a12bd` | Hover, links on glass |
| Ember | `#fa5a1a` | The one accent: things that are open or on. Used sparingly |
| Court | `#0a7a4f` | OK / verified |
| Stop | `#c4271f` | Danger |
| Graphite | `#5d5b73` | Muted text |
| Jioni ink | `#0c0a24` | Text, plate rims |
| Jioni paper | `#ffffff` | Page, surfaces, plate faces |

Light theme: page and surfaces are both white; lines (`rgba(12,10,36,.12)`) do the dividing, not grey fills. The
only tinted fill is `--color-sunk` `#f1f0fb`.

Dark theme: page `#050507`, surface `#0f0f15`, raised `#17171f`, sunk `#1a1a23` (small lightness steps, a faint
violet tint, no navy). Text `#f3f2fa`, muted `#a5a3ba`. The brand is re-tuned to glow: action `#5b45ff`, brand
`#7c6bff`, link and focus `#9d91ff`, plus `--color-glow` (`rgba(124,107,255,.5)`), used only on the lit stop of the
home rail and the thread's nodes. Ember `#ff6a2b`, ok `#3ddc97`, danger `#ff8078`.

Raw names are prefixed (`--jioni-paper`, `--jioni-ink`) because `src/styles.css` still owns the legacy aliases
`--paper` and `--ink`; sharing the names made a cycle that blanked the light theme's tokens.

## Type

- Display: **Unbounded** (variable, OFL 1.1), latin subset, 50 KB WOFF2, preloaded. Headlines, the counter, number
  plates. Wide and round: reads as signage at 390 px without shouting.
- Text and UI: **Instrument Sans** (variable, OFL 1.1), latin subset, 30 KB WOFF2.
- Both `font-display: swap`, self-hosted in `src/ui/fonts/` (CSP `font-src 'self'`). 80 KB total.
- Scale (rem): 0.75, 0.875, 1, 1.125, 1.375, 1.75, 2.375, 3.25. Weights: body 400, UI 550, strong 650, display 600,
  numerals 700. Display line-height 0.95 to 1.1 with slight negative tracking; body 1.5.

## The home film ("the dossier")

`src/features/home/Film.tsx`. A 400svh section whose stage is sticky inside the scroller (`<main>` on desktop,
the document on phones). Five scenes (find, check, known, plan, eat): the photograph cross-fades, the headline and
rows change, a number plate counts real catalogue numbers, and six icon slots (name, distance, evidence, hours,
contact, price) fill in as the profile assembles. The rail down the left is the page's thread and continues past
the film to the Go section and the county index. Scene changes come from an IntersectionObserver on step markers;
where `animation-timeline` exists the rail fill, the thread and the picture drift are scrubbed by scroll. Reduced
motion, or no IntersectionObserver, gives a still sequence of the five scenes, each with its picture and numbers.

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
