# DESIGN-SYSTEM.md — Brand Tokens & UI Rules

**Owner:** Viral Parikh
**Last updated:** 2026-08-08
**Source of truth for:** RedyQuote's design tokens, the rules for using them, and the
accessibility floor every color must clear.

> **History:** this file's palette has been superseded twice — see §1 for the full timeline
> (REDYREF logo red → muted Clay/Stone/Moss → REDYREF's actual brand hexes). The most recent
> source export was mirrored at
> `docs/superpowers/specs/2026-07-31-redyref-admin-actual-brand-color-design.md` during design
> work; it has since been folded into this file in full (§1 records what carried over verbatim
> vs. what was re-solved), and that file has been deleted — no other file or external project
> is a dependency of this one — with one exception, below.
> Depends on: [PRD.md](PRD.md) **NFR-008** for the supported viewport range, which §9's rail
> breakpoints are derived from and must not restate. That row is upstream of this file; the
> palette and token rules remain self-contained.
> Implemented in: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/`,
> `eslint.config.mjs`

---

## 1. Where the brand values came from

**The whole palette, both type families, and the radius/type/shadow scales come from Claude
design exports of a system for an _internal admin/estimating tool_** — Quotes, Quote Builder,
Products, Component Library, Settings.

This is the **second** supersession of this file's palette:

1. The original token layer was built from the REDYREF logo red `#ad0000` with Barlow / Barlow
   Condensed.
2. It was superseded by a muted "Clay/Stone/Moss" palette (rose/gray/sage) deliberately **not**
   matching REDYREF's marketing brand, to avoid a red-on-red clash between the logo and active
   nav in the sidebar.
3. **That muted palette is now superseded by REDYREF's actual brand hexes** — red `#A81D22`,
   ink `#1A1A1A`, accent blue `#1E5FBF` — because matching the marketing brand is now the
   explicit point, not a risk to manage. The old caveat about the logo sitting near an
   adjacent-but-different red is moot: the sidebar's active nav and the logo are now the _same_
   red family on purpose.

| Value                                                       | Source                                                                                                                                         |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand anchors: red `#A81D22`, ink `#1A1A1A`, blue `#1E5FBF` | The export's source-of-truth hexes. Clay/Stone/Moss ramps resolved from these via its `color-mix()` formulas to literal values (see §2 below). |
| Status triads (success/warning/danger/info)                 | Same export, re-solved where AA failed — see §4.                                                                                               |
| Archivo + IBM Plex Mono                                     | Same export. Unchanged from the prior source.                                                                                                  |
| Radius, type, spacing, shadow scales                        | Same export. Unchanged — both exports specify the identical ladder.                                                                            |
| Editable-vs-calculated field convention                     | Same export — now amber/warning-tinted, not brand-color-tinted. See §7.                                                                        |

Nothing of the muted Clay/Stone/Moss palette's actual _values_ survives; the three-tier
_architecture_ it established (below) is unaffected and carries forward unchanged, as does the
"compute the contrast, don't eyeball it" governing rule that produced every number in this file.

## 2. The three tiers

| Tier                   | Where                                         | May components use it?                            |
| ---------------------- | --------------------------------------------- | ------------------------------------------------- |
| 1 — Brand primitives   | `:root` in `globals.css`, **not** in `@theme` | **No.** Tailwind emits no utility for them.       |
| 2 — Semantic tokens    | `@theme inline` in `globals.css`              | **Yes — these are the only color names allowed.** |
| 3 — Component variants | `cva()` in `src/components/ui/`               | Yes.                                              |

Tier 1 being outside `@theme` is deliberate and load-bearing: Tailwind only generates
utilities for `@theme` entries, so `bg-clay-600` **does not exist as a class**. A primitive
cannot be reached from a component even by accident.

**Tier-1 values are written as hex; derived values are written in oklch.** That split is the
provenance marker — hex came from the design source and can be diffed against it; oklch was
solved here by lightness. There are exactly five derived primitives, all forced by contrast
(see §4).

## 3. The one rule: semantic tokens only

Components use `bg-background`, `text-muted-foreground`, `bg-primary`, `border-border`,
`text-success` — never `bg-stone-100`, `text-black`, or `bg-[#82424c]`. Raw palette classes and
hex literals bypass the token layer: they don't flip in dark mode and they don't re-theme when
a brand value changes.

This is **enforced, not documented**, in two layers:

1. Tier-1 primitives generate no utilities (above).
2. `no-restricted-syntax` in `eslint.config.mjs` rejects raw palette classes and hex literals
   in `className` strings and template literals across `src/**/*.tsx`.

Note that the lint rule bans `bg-stone-*` meaning **Tailwind's** warm stone, which is a
different thing from our `--stone-*` ramp. The two never collide: ours is `--stone-500`,
Tailwind's is `--color-stone-500`.

Same philosophy as the RLS approval gate and the `ui/` boundary rule — if it matters, the build
enforces it.

## 4. Accessibility floor

**Text clears WCAG AA (4.5:1) in every role it is used in; boundaries that identify a control
clear the 1.4.11 non-text floor (3:1).** This is a floor, not an aspiration.

The new source's palette is rougher than the prior one: several raw values fail outright once
computed rather than eyeballed. **Five values were re-solved rather than shipped as the export
gives them:**

| Export value                                  | What it's used for              | Measured                                                        | Resolution                                                |
| --------------------------------------------- | ------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| `--stone-800` (88% ink + black)               | Ramp step between stone-700/900 | L .191 — darker than stone-900's L .218, breaks monotonic order | Re-mixed as 88% ink + 12% white → `#313131`               |
| `--warning-fg #C77700`                        | Pending-Approval ink            | 3.46:1 on white, 3.09 on page — fails as text outright          | Darkened along the same hue to `#9c5400` — 5.70 / 5.09    |
| `--success-light #E3F1E4`                     | Tint behind the success ink     | Ink-on-tint 4.39:1 — misses the floor by a hair                 | Re-mixed lighter (8% ink) → `#eef4ee` (4.59)              |
| `--focus-ring` / `--shadow-focus` (alpha red) | Focus ring                      | Alpha-blended, well under 3:1 on any surface                    | `--ring` is clay-600, solid — 6.54:1 on the canvas        |
| Editable-border "45% into white" formula      | Editable-cell boundary          | ~2:1 on every surface                                           | Uses the unmixed warning ink instead — 5.70 / 5.09 / 4.88 |

**The `--border` vs `--input` split from the prior palette carries forward unchanged** — the
export again gives one value (`stone-200`) for two incompatible jobs: decorative rules and
control boundaries. Only the second carries a 3:1 floor. So:

- **`--border`** — decorative only. WCAG 1.4.11 exempts purely decorative boundaries, so this
  is `stone-200` **verbatim** (1.48:1 on white — fine, nothing here needs a floor). Card
  outlines, table rules, dividers, and the status/Tag/Badge borders in §7.
- **`--input`** — the boundary that _identifies a control_. Stepped to `stone-600`, which clears
  3:1 on all three light surfaces (5.66 card / 5.05 page / 5.05 muted). Text inputs, selects,
  checkboxes, radios, outline buttons.

This is also exactly shadcn's existing distinction between the two tokens, so it costs nothing
structurally — same fix, same reasoning as the prior palette.

Two things kept **verbatim** on purpose, not oversights:

- **Elevation shadows and the modal scrim are ink-tinted** (`rgba(26,26,26,…)`). No longer a
  "kept despite a cool palette" carve-out like the prior revision — ink IS the neutral anchor
  now, so the shadow tint and the palette finally agree.
- **Badge/Tag/StatusPill borders sit well under 3:1** (e.g. `--primary-border` on white is only
  1.92:1). Decorative in the same sense as `--border` above — the tint plus ink text already
  carries the status meaning, the border is a soft edge rather than the thing identifying the
  control — so no floor applies.

**Links are distinguished from surrounding text by weight, not by hue alone — a decision, not an
omission.** `--primary-text` on the page canvas measures 7.03:1 and `--foreground` 16.67:1, so
both clear AA against the surface. Against _each other_ they measure **2.37:1**, under the 3:1
that WCAG technique G183 asks for when a link carries no underline. G183 is a _sufficient_
technique for 1.4.1, not the only one: the non-color cue here is weight — links render
`font-semibold` against `font-normal` neighbours — plus an underline on hover and a solid
`--ring` on keyboard focus. Measured on `/products`, accepted 2026-08-08.

Two consequences, stated so this doesn't get re-litigated per screen:

- **Don't add a local underline to "fix" one table.** `a { no-underline }` in `globals.css` is
  global; a per-surface underline rule makes links look unlike links on the screen beside it,
  which costs more than the 2.37:1 does.
- **The weight contrast is load-bearing, not decoration.** A link set at the same weight as the
  text around it has no non-color cue left and _does_ fail 1.4.1. If a link has to live
  somewhere that cannot carry `font-semibold`, that link needs an underline there.

### Measured, light

| Pair                                                                     | Ratio                     | Floor            |
| ------------------------------------------------------------------------ | ------------------------- | ---------------- |
| `--foreground` on page / card / muted                                    | 16.67 / 17.40 / 15.55     | 4.5              |
| `--muted-foreground` on page / card / muted                              | 5.42 / 5.66 / 5.05        | 4.5              |
| `--primary-text` (links) on page / card / muted                          | 6.54 / 7.33 / 6.55        | 4.5              |
| `--primary-foreground` on the clay fill                                  | 7.33                      | 4.5              |
| `--accent-secondary-foreground` on the moss fill                         | 6.10                      | 4.5              |
| `--success` / `--warning` / `--destructive` / `--info` on their own tint | 4.59 / 4.88 / 6.45 / 6.95 | 4.5              |
| same four as ink on a card                                               | 5.13 / 5.70 / 7.58 / 8.55 | 4.5              |
| `--input` on page / card / muted                                         | 5.05 / 5.66 / 5.05        | 3.0              |
| `--editable-border` on white / page / own fill                           | 5.70 / 5.09 / 4.88        | 3.0              |
| `--ring` on page / card / muted                                          | 6.54 / 7.33 / 6.55        | 3.0              |
| `--sidebar-ring` on the rail / on hover                                  | 5.63 / 4.21               | 3.0              |
| `--sidebar-foreground` on the rail / on hover                            | 8.03 / 6.00               | 4.5              |
| `--primary-text` vs `--foreground` (link vs adjacent text)               | 2.37                      | none — see above |

`--muted-foreground` is now `--stone-600` — an actual ramp step, not a custom-solved hex like the
prior palette needed. The new ink anchor's ramp happens to land a usable step here.

**Every pair above was computed with a throwaway contrast script, not eyeballed.** The prior
palette's "88 pairs, all pass" claim doesn't carry forward as a number — the role set is the
same, but every value underneath it changed, so re-run the computation before trusting any
figure in this file rather than assuming it still holds.

## 5. Dark mode is derived, not designed

**The design system is light-only.** Every dark value here was solved and measured in this
repo; none of it comes from the design source. Treat it as an implementation of the light
system's logic in a dark band, not as REDYREF design.

Consequences worth knowing:

**Clay splits into two tokens.** No single lightness does both jobs on a dark surface: a fill
dark enough to carry `--primary-foreground` reads too dim as ink, and ink light enough to pass
drops the fill below AA. So `--primary` is the fill and **`--primary-text`** is clay used _as_
ink. In dark mode use `text-primary-text` for links and active nav, never `text-primary`. In
light mode the two are the same value.

**Hover darkens in dark mode too.** Normally a dark theme lightens on hover, but clay-400 as a
_fill_ holds `--primary-foreground` at only 3.09:1 — lightening would break AA on the exact
state the pointer is on. So `--primary-hover` darkens in both modes (clay-500 → 600 → 700).

**Only two derived primitives are needed now, down from five.** The prior muted palette needed
`--clay-550` and `--moss-550` because neither ramp had a step that both carried
`--primary-foreground`/white at AA _and_ stayed light enough to separate from a dark canvas.
Recomputed against the new anchors, that gap doesn't exist:

| Old need                       | Still needed?            | Why                                                                                                                                                                                                     |
| ------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--clay-550`                   | **No**                   | `--clay-500` already carries white at 5.02:1 as a dark-mode fill while separating from the canvas at 3.96:1 — the new red anchor's ramp happens to have a usable step where the old rose anchor didn't. |
| `--moss-550`                   | **No**                   | `--moss-600` already carries white at 6.10:1 while separating from the canvas at 3.26:1 — same story.                                                                                                   |
| `--stone-950` / `--stone-1000` | **Yes**                  | Independent of hue — dark mode still needs `stone-900` (ink) for its _raised_ surface, so canvas and card must sit below the ramp.                                                                      |
| dark status tints              | **Yes** (values changed) | Status inks are still pinned at oklch L 0.720 so the tints sit high enough to be visible against the card; only the underlying hues moved (destructive most of all — see §6).                           |

This is a genuine simplification, not an oversight: fewer derived primitives because the new
anchors' ramps happen to have usable steps in more places, verified by recomputation rather than
assumed.

## 6. Decisions worth not re-litigating

**Brand red is scoped to interaction, never a surface.** Filled primary buttons, links, the
focus ring, and active nav/tab all carry `--primary`; it never fills a large surface or a
page/card background. One filled-primary action per screen — everything else uses
`--accent-secondary` (ink) or a ghost/outline variant. This bounds where red gets added going
forward, not just where the palette started.

**`destructive` is a tint, never a solid fill — and now a genuinely different hue, not just a
darker red.** The export's own color and component treatments reuse `--color-brand-red` for
danger, filled vs.
outlined. That worked under the prior muted palette because primary itself was a desaturated
rose, not a saturated brand red — any same-hue "danger" variant still read as merely _adjacent_
to primary. Once primary is an actual saturated `#A81D22`, a same-hue destructive (darker,
browner, less saturated — anything still on that hue) reads as "the brand red, slightly off"
rather than a different signal. That's a stronger version of the exact confusion this section
already flagged once, so it isn't something to re-litigate downward this time.

`--destructive` is moved to a **burnt-orange/rust hue** (~38° in OKLCH: `#9b2d00`), sitting
between clay (~26°) and warning/amber (~59°) — three-way hue separation using the language this
file already speaks in, while staying in the "warm alarm" register (a cool hue like blue or
green would read as neutral or positive, a worse failure than resembling primary). It keeps the
tint/ink/border structure unchanged — the fix is the underlying hue, not the shape — exactly
like the export's own StatusPill and Toast treatments for danger. Primary stays unambiguous, and
now Delete does too.

**Moss lives in `--accent-secondary`, not `--secondary`, and is now blue.** The export's
"secondary action" is a moss fill; shadcn's `--secondary` is a subtle _gray surface_, used by
imported components as a Progress track and similar. Overloading it would turn those blue.
`--secondary` stays stone-100; the moss action pair is its own token. Moss was sage green in the
prior palette and is REDYREF's actual accent blue now — same naming quirk this file already
carries for `--stone-*` vs. Tailwind's own "stone" palette (see §3): the variable name is legacy,
not descriptive. One consequence worth knowing: moss's "info" role and the Tag "moss" tone now
both land in the same accent-blue family (they were already both blue-adjacent under the old
naming coincidence; now it's the same literal hue) — see the token map in §12.

**`--accent` stays neutral.** shadcn uses it for every generic hover, so tinting it clay would
put brand color on every dropdown row. The clay tint is scoped to active nav and to
`--primary-muted`.

**`--muted` / `--secondary` / `--accent` are darker than `--background`.** A recessed surface
lighter than the page canvas reads inside-out. stone-100 recedes correctly on both a white card
and the stone-50 canvas.

**The radius ladder is explicit, not a `calc()` chain.** 6 → 10 → 16 → 22 is not a constant
multiple; forcing it onto one base distorted the middle steps. Don't "simplify" it back.

**`ghost` keeps its borderless variant.** The design system's "ghost" button has a 1px border —
that is this repo's `outline`. A genuinely borderless variant is retained for dense toolbars
and icon rows, which the design system itself needs for `IconButton`.

## 7. The editable-vs-calculated convention

The product-specific pattern from the original export: estimators must tell at a glance what they can
type into versus what the system computes.

**Now amber/warning-tinted, not clay-tinted.** The prior palette used a clay (brand) tint +
border for editable cells; the new export moves this to the amber/warning family instead — a
deliberate convention change, not a side effect of the color swap, since RedyQuote adopted the
export's editable-field spec as-is per this decision.

- **Editable** — `bg-editable` (the warning tint, `#fbebd6`) + `border-editable-border` (the
  unmixed warning ink, `#9c5400`) + value in `font-mono tabular-nums`.
- **Calculated** — no tint, no border, plain text. `bg-card` if boxed at all.

**The border is what carries the meaning, not the tint.** The tint alone reads at low contrast
against a white card — invisible on its own, same problem the prior clay-tint convention had.
That's why the border uses the unmixed ink rather than the export's own "45%-into-white" border
formula, which measured only ~2:1 on every surface (see §4).

**One overlap worth flagging, not redesigning:** editable cells and the Pending-Approval badge
now share the same warning hue family. They stay structurally distinguishable — a rectangular
input with mono tabular digits vs. a pill with a status label — so this is documented rather
than treated as a conflict to solve.

## 8. Typography

| Token         | Family        | Use                                                                        |
| ------------- | ------------- | -------------------------------------------------------------------------- |
| `--font-sans` | Archivo       | Everything — headings, body, tables, nav                                   |
| `--font-mono` | IBM Plex Mono | Tabular numerics only: costs, SKUs, %, quantities, editable numeric fields |

Both are self-hosted by `next/font/google` — no external request, no layout shift. The design
system's `@import` from `fonts.googleapis.com` is deliberately not used.

**There is no separate heading family.** Archivo is display _and_ body; `h1`–`h4` differ from
body by weight (600) and tracking (`-0.01em`), not by face. `--font-heading` no longer exists —
one grotesk keeps a dense quote table visually quiet.

**Italic Archivo is reserved for rare brand-voice moments, never body copy.**

**Money and quantities use `font-mono tabular-nums`** so figures don't jitter as digits change.
Both are stock Tailwind utilities; there is no custom class for it.

## 9. Scales

**Type** — 12 / 13 / **15 (base)** / 17 / 20 / 24 / 30 / 40 / 52px, denser than Tailwind's
default at every step. `text-md` (17px) has no Tailwind default; defining `--text-md` creates
it. Leading: tight 1.15 / snug 1.35 / **normal 1.55** / relaxed 1.7. Tracking: tight -0.01em /
wide 0.04em.

**Radius** — `rounded-sm` 6px (chips, inputs, tags) · `rounded-md` 10px (buttons, icon buttons,
tables) · `rounded-lg` 16px (cards) · `rounded-xl` 22px (modals, panels) · `rounded-full`
(badges, switches). **Never 0px.** Note that `rounded-lg` is a _card_ radius here, not a button
one — shadcn components pasted in unchanged may need `rounded-md`.

**Spacing** — the design system's 4px scale is already Tailwind's default (`p-2` = 8px, `p-6` =
24px). No tokens added. Density rule: 8–12px inside table cells and toolbars, 24–32px around
page-level sections.

**Motion** — 120–160ms ease-out opacity/fade only, for toasts, tooltips and dialogs. **No scale
or translate on press** — this is a data tool, and motion must never make a number feel
imprecise. The press state darkens a step (`--primary-active`) instead.

**Elevation** — increases with layering (modal > popover > card), never with hover.

**Layout** — left sidebar, a persistent top bar (breadcrumb-style, e.g. "Home / Quotes / New"),
and an independently-scrolling content area. Primary content pattern is either "toolbar + KPI
strip + table" or "form + live-calculated summary panel."

**Supported viewports are set by [PRD.md](PRD.md) NFR-008 — tablet and up (≥768px)**, and that
row is the authority; don't restate the range here, it will drift. What follows from it for the
chrome: there is no phone drawer and no hamburger, and 768px is the narrowest width any layout
below is designed against.

**The rail collapses, it does not resize.** 220px at `xl` (≥1280px) and above; 64px icons-only
below it. Two widths, no intermediate step. A fixed 220px is 29% of a 768px tablet, which cost
the quotes table 297px of its 787px of columns — the collapse returns 152px of that. Below `xl`
the wordmark chip is hidden rather than scaled (it is the only brand asset, and it is illegible
at 40px), each item keeps its label as `sr-only` for its accessible name, and a right-side
tooltip carries the label for sighted users.

**Why `xl` and not `lg`.** A two-width rail always makes the content area shrink at the moment
it expands; the step cannot be removed, only placed. At `lg` it landed badly — 959px of content
at 1023px, then 804px at 1024px, which clipped 41px off the quotes table exactly when the
window got bigger. At `xl` the same 155px step falls at 1280px, where 1060px of content still
clears the 787px table with room over. **The rule is not that content width grows monotonically;
it is that the narrow side of the step still fits the widest table.** Check that measurement
before moving this breakpoint, and re-check it if a table gains columns.

**Surfaces** — flat color only: no gradients, no photographic imagery, no textures or patterns.

## 10. Chart series

`--chart-1..5` is a **categorical** palette: fixed order, never cycled, color follows the
entity and never its rank. The design system does not specify one, so this is derived here,
anchored on clay (brand) and moss so it sits with the palette rather than fighting it:

| Token       | Hue       |
| ----------- | --------- |
| `--chart-1` | clay/red  |
| `--chart-2` | violet    |
| `--chart-3` | ochre     |
| `--chart-4` | teal      |
| `--chart-5` | moss/blue |

**`--chart-4` moved off blue.** Applying the old "anchor chart-1 on clay, chart-5 on moss" rule
verbatim, unchanged, would put two near-identical blues adjacent in the series: moss is now
blue-anchored (~259° hue), and chart-4 was already blue (~250°) in the prior palette. Re-picked
to teal (~172°) instead — the widest gap available between ochre (~85°) and moss (~259°) — so
the series keeps five genuinely distinct hues rather than shipping a near-duplicate pair.

Every step clears 3:1 on both light and dark surfaces (light: 4.90 / 4.95 / 3.97 / 4.04 / 4.33
on white; all ≥3.54 on the page canvas). Status colors are reserved and are never reused as a
series color. A 6th series is not a generated hue — fold it into "Other", facet it, or use small
multiples.

## 11. Voice

From the original brand-voice export, and it constrains copy in components:

- **Title Case for top-level labels** — primary nav, page headers, tabs, and section headers use Title Case.
- **Sentence case for supporting UI copy** — buttons, table headers, form labels, help text, and status copy stay sentence case. No ALL-CAPS.
- **Buttons are short verb phrases** — "New quote", "Save quote", "Submit for approval".
- **Numbers are the content, not the pitch.** Money, percentages, and counts are primary;
  copy labels a number, it doesn't sell it.
- **Warnings are factual**, never alarmist: "Margin floor: 20.0% — below this routes for
  approval." No exclamation points.
- **Help text is one calm sentence under a control** — never a tooltip standing in for real
  labeling.
- **No emoji in-product**, ever. Icons are Lucide (`lucide-react`), used sparingly — row
  actions, nav, status — never decoratively.
- **Empty and loading states are plain.** "Loading…" — no illustration, no cute copy.

## 12. Token map — design system → RedyQuote

Useful when reading the two documents side by side. RedyQuote keeps **shadcn's semantic names**
so imported shadcn components work untouched; only the values changed.

| Design system                                | RedyQuote                                                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `--bg-page`                                  | `--background`                                                                            |
| `--bg-surface`                               | `--card` / `--popover`                                                                    |
| `--bg-surface-sunken` / `--bg-surface-inset` | `--muted` (also `--secondary`, `--accent`)                                                |
| `--text-primary`                             | `--foreground`                                                                            |
| `--text-secondary` / `--text-tertiary`       | `--muted-foreground` (collapsed to one; 4.56:1 on muted)                                  |
| `--text-on-accent`                           | `--primary-foreground`                                                                    |
| `--text-link` / `--text-link-hover`          | `--primary-text` / `--primary-hover`                                                      |
| `--accent-primary` / `-hover` / `-active`    | `--primary` / `--primary-hover` / `--primary-active`                                      |
| `--accent-secondary` / `-hover`              | `--accent-secondary` / `--accent-secondary-hover`                                         |
| `--border-default`                           | `--border` (decorative) — **split**, see §4                                               |
| `--border-strong`                            | `--input` (control boundaries) — **split**                                                |
| `--focus-ring` / `--shadow-focus`            | `--ring` (solid, `ring-3`)                                                                |
| `--editable-field-bg` / `-border`            | `--editable` / `--editable-border`                                                        |
| `--success-bg` / `-fg` / `-border`           | `--success-muted` / `--success` / `--success-border`                                      |
| `--danger-*`                                 | `--destructive-*` — **different hue than brand red**, see §6                              |
| Tag tone "clay"                              | `--primary-muted` / `--primary-border`                                                    |
| Tag tone "moss"                              | `--info` / `--info-muted` — converges with the info status color now both are accent-blue |
| StatusPill                                   | `Badge` — folded in, no separate component; see §13                                       |
| IconButton                                   | `Button` (`icon` / `icon-sm` / `icon-lg` sizes) — folded in, see §13                      |
| `--container-max`                            | `--container-max` (unchanged)                                                             |

## 13. Adding a component

1. Check [PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md) §2 for where it goes.
2. Define variants with `cva()` — see `src/components/ui/button.tsx` and `badge.tsx`.
3. Use semantic tokens only. Lint will reject anything else.
4. Anything in `src/components/ui/` must stay **app-agnostic** — it is the future shared
   RedyRef library, and the boundary is enforced in `eslint.config.mjs`. `badge.tsx` knows
   about `success` / `warning` / `info`, not about "Pending Approval". App-specific mappings
   live in `src/components/`.
5. If you add a color, compute its contrast in both modes before committing (§4).
6. Three components from the original component inventory are folded into existing shadcn
   primitives, not built separately — the mapping is already decided, don't rebuild them:
   - **StatusPill → `Badge`** — same tint/ink/border shape, same pill radius.
   - **Tag → `Badge`** — the "clay" tone is `Badge`'s `default` variant; the "moss" tone
     converges with `info` now both are accent-blue.
   - **IconButton → `Button`**'s `icon`/`icon-sm`/`icon-lg` sizes, borderless ghost
     variant included.
     The remaining components (Card, Input, Select, Checkbox, Radio, Switch, DataTable, KpiStat,
     Dialog, Toast, Tooltip, EmptyState, Tabs, Sidebar, Topbar) are built as new files under
     `src/components/ui/` (Sidebar/Topbar under `src/components/layout/` instead — see
     [PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md)), translated to `cva()` + semantic tokens with no
     inline styles or CDN dependencies.
