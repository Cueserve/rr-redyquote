# DESIGN-SYSTEM.md — Brand Tokens & UI Rules

**Owner:** Viral Parikh
**Last updated:** 2026-07-27
**Source of truth for:** RedyQuote's design tokens, the rules for using them, and the
accessibility floor every color must clear.

> Derived from: the **REDYREF Proposal System design system** (Clay / Stone / Moss), authored in
> Claude design —
> [project dd4df4df](https://claude.ai/design/p/dd4df4df-16e8-45f4-8daf-6a2ca67183bc)
> Implemented in: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/`,
> `eslint.config.mjs`

---

## 1. Where the brand values came from

**The whole palette, both type families, and the radius/type/shadow scales come from one
source: the REDYREF Proposal System design system.** It is a design for an _internal
admin/estimating tool_ — Quotes, Quote Builder, Products, Component Library, Settings — and it
is deliberately **not** REDYREF's public red/black marketing brand.

| Value                                       | Source                                                |
| ------------------------------------------- | ----------------------------------------------------- |
| Clay / Stone / Moss ramps                   | The design system, §2. Hex values used verbatim.      |
| Status triads (success/warning/danger/info) | The design system, §2. Verbatim.                      |
| Archivo + IBM Plex Mono                     | The design system, §3.                                |
| Radius, type, spacing, shadow scales        | The design system, §4.                                |
| Editable-vs-calculated field convention     | The design system, §6 — the product-specific pattern. |

**This supersedes the previous token layer**, which was built from the REDYREF logo red
`#ad0000` with Barlow / Barlow Condensed. Nothing of that palette survives. The earlier
derivation is not wrong about the marketing brand — it is simply answering a different
question, because this tool now has its own visual language.

### The one thing to be aware of

Clay-600 `#82424c` is a muted rose; the logo red is `#ad0000`. Those are **neighbours, not
strangers** — and §7.17 of the design system puts the red/black logo on a white chip inside a
stone-900 sidebar, a few pixels from active nav items filled clay-600. "Distinct from the
marketing brand" reads as deliberate when the colors are unrelated; when they are adjacent
reds, it can read as one red badly reproduced. If the sidebar ever looks wrong, that is why,
and the fix is the logo treatment (or a monochrome logo lockup), not the palette.

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

The design system's palette is largely clean: of the 27 color pairs it specifies, 24 pass as
written. **Three of its tokens do not hold up in the roles it assigns them**, and all three were
re-solved rather than shipped:

| Design-system value                | Its own claim                           | Measured                                                             | Resolution                                                 |
| ---------------------------------- | --------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| `--border-default #8a949b`         | "~3.1:1 on white ✓"                     | 3.09 on white but **2.91 on the page canvas**, **2.78 on stone-100** | Split into two tokens — see below                          |
| `--focus-ring` clay-400            | "visible 3px soft clay ring"            | **3.05** on white, **2.74** on stone-100                             | `--ring` is clay-600, solid — 6.97:1 on the canvas         |
| `--editable-field-border` clay-300 | carries the editable/calculated meaning | **1.90:1** — not perceivable                                         | Stepped to clay-500 — 4.49 on a card, 3.93 on its own fill |

**The border split is the substantive one.** The design system uses `--border-default` for two
incompatible jobs: decorative rules (card outlines, table row separators) _and_ control
boundaries (`IconButton`, `Input`, `Select`). One value cannot serve both, because only the
second carries a 3:1 floor. So:

- **`--border`** — decorative only. WCAG 1.4.11 exempts purely decorative boundaries, so this
  is the design system's `#8a949b` **verbatim**. Card outlines, table rules, dividers.
- **`--input`** — the boundary that _identifies a control_. Stepped to stone-600, which clears
  3:1 on all three light surfaces (3.63 card / 3.42 page / 3.26 muted). Text inputs, selects,
  checkboxes, radios, outline buttons.

This is also exactly shadcn's existing distinction between the two tokens, so it costs nothing
structurally.

Two more things the design system got internally inconsistent, both leftovers from a warmer
earlier revision:

- **`--shadow-focus` was orange** (`rgba(203,127,85,0.35)` = `#cb7f55`) under a §5 that calls it
  "a soft clay ring", while a separate `--focus-ring: var(--clay-400)` went unused. Replaced by
  a solid `ring-3 ring-ring`. **Never `ring-ring/50`** — alpha-blending clay-600 over a light
  surface lands near 1.6:1 and fails the non-text floor.
- **Elevation shadows and the modal scrim are warm brown** (`rgba(61,53,41,…)`,
  `rgba(36,31,24,0.4)`) under a palette described as cool throughout. Kept **verbatim** — they
  are alpha-composited at 6–14%, the hue is barely resolvable, and §8 rule 6 states the warm
  tint as an intentional rule twice. Flagged here so nobody "fixes" it as a bug.

### Measured, light

| Pair                                                                     | Ratio                     | Floor |
| ------------------------------------------------------------------------ | ------------------------- | ----- |
| `--foreground` on page / card / muted                                    | 13.66 / 14.53 / 13.05     | 4.5   |
| `--muted-foreground` on page / card / muted                              | 4.78 / 5.08 / 4.56        | 4.5   |
| `--primary-text` (links) on page / card / muted                          | 6.97 / 7.41 / 6.66        | 4.5   |
| `--primary-foreground` on the clay fill                                  | 7.05                      | 4.5   |
| `--accent-secondary-foreground` on the moss fill                         | 5.85                      | 4.5   |
| `--success` / `--warning` / `--destructive` / `--info` on their own tint | 6.37 / 5.56 / 5.51 / 6.49 | 4.5   |
| same four as ink on a card                                               | 8.00 / 6.89 / 7.71 / 8.45 | 4.5   |
| `--input` on page / card / muted                                         | 3.42 / 3.63 / 3.26        | 3.0   |
| `--editable-border` on card / page / own fill                            | 4.49 / 4.22 / 3.93        | 3.0   |
| `--ring` on page / card / muted                                          | 6.97 / 7.41 / 6.66        | 3.0   |
| `--sidebar-foreground` on the rail / on hover                            | 10.11 / 6.48              | 4.5   |

`--muted-foreground` (the design system's `--text-tertiary`) is solved against stone-100, the
darkest light surface it can land on, so it holds AA everywhere.

**88 pairs are checked across both modes and all 88 pass. When adding or changing a color,
compute the contrast — do not eyeball it.**

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
_fill_ holds `--primary-foreground` at only 3.0:1 — lightening would break AA on the exact
state the pointer is on. So `--primary-hover` darkens in both modes, matching the design
system's own "clay-600 → 700 → 800" rule.

**Five derived primitives exist only because the ramps ran out:**

| Primitive         | Why                                                                                                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--clay-550`      | The only clay lightness carrying `--primary-foreground` at AA (4.52:1) while staying light enough to separate from a dark page. clay-500 measures 4.27:1 — fails; clay-600 is too dark to read as a fill. |
| `--moss-550`      | Same problem: moss-500 holds white at 3.91:1, moss-600 is too dark on a dark canvas.                                                                                                                      |
| `--stone-950`     | Dark mode needs stone-900 for its _raised_ surface, so the canvas and card must sit below the ramp.                                                                                                       |
| `--stone-1000`    | As above.                                                                                                                                                                                                 |
| dark status tints | Status inks are pinned at oklch L 0.720 so the tints can sit high enough to be visible against the card.                                                                                                  |

## 6. Decisions worth not re-litigating

**`destructive` is a tint, never a solid fill.** The design system §7.1 specs a solid
`--danger-fg` background for the danger button. Measured, that fill sits **OKLab ΔE 5.3 from
the primary clay fill** — _less_ separation than primary has from its own hover step (ΔE 7.0).
A "Save quote" and a "Delete line" button would read as the same control. Both are dark
desaturated reds, which is a consequence of the primary no longer being a saturated brand red.
So `destructive` uses the tint/ink/border set, exactly like the design system's own StatusPill
and Toast treatments for danger. Primary stays unambiguous.

**Moss lives in `--accent-secondary`, not `--secondary`.** The design system's "secondary
action" is a moss fill; shadcn's `--secondary` is a subtle _gray surface_, used by imported
components as a Progress track and similar. Overloading it would turn those sage. `--secondary`
stays stone-100; the moss action pair is its own token.

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

The product-specific pattern (design system §6): estimators must tell at a glance what they can
type into versus what the system computes.

- **Editable** — `bg-editable` (clay-50 tint) + `border-editable-border` (clay-500) + value in
  `font-mono tabular-nums`.
- **Calculated** — no tint, no border, plain text. `bg-card` if boxed at all.

**The border is what carries the meaning, not the tint.** Clay-50 is only 1.14:1 against a
white card — invisible on its own. That is why the design system's clay-300 border (1.90:1) had
to be stepped up: at that value the convention was decoration, not a cue.

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

## 10. Chart series

`--chart-1..5` is a **categorical** palette: fixed order, never cycled, color follows the
entity and never its rank. The design system does not specify one, so this is derived here,
anchored on clay (brand) and moss so it sits with the palette rather than fighting it:

| Token       | Hue    |
| ----------- | ------ |
| `--chart-1` | clay   |
| `--chart-2` | violet |
| `--chart-3` | ochre  |
| `--chart-4` | blue   |
| `--chart-5` | moss   |

Ordered by search so the worst adjacent pair is as separable as possible. Validated in both
modes against the lightness band, chroma floor, surface contrast, and dichromat separation
(Viénot projection, OKLab ΔE): every step clears 3:1 on both surfaces, and the worst adjacent
pair is **ΔE 13.6 light / 13.7 dark**. Dark values are re-stepped into the dark band, not
flipped.

Status colors are reserved and are never reused as a series color. A 6th series is not a
generated hue — fold it into "Other", facet it, or use small multiples.

## 11. Voice

From the design system §1, and it constrains copy in components:

- **Sentence case everywhere** — nav, buttons, table headers. No ALL-CAPS, no Title Case.
- **Buttons are short verb phrases** — "New quote", "Save quote", "Submit for approval".
- **Warnings are factual**, never alarmist: "Margin floor: 20.0% — below this routes for
  approval." No exclamation points.
- **No emoji in-product**, ever. Icons are Lucide (`lucide-react`), used sparingly — row
  actions, nav, status — never decoratively.
- **Empty and loading states are plain.** "Loading…" — no illustration, no cute copy.

## 12. Token map — design system → RedyQuote

Useful when reading the two documents side by side. RedyQuote keeps **shadcn's semantic names**
so imported shadcn components work untouched; only the values changed.

| Design system                                | RedyQuote                                                |
| -------------------------------------------- | -------------------------------------------------------- |
| `--bg-page`                                  | `--background`                                           |
| `--bg-surface`                               | `--card` / `--popover`                                   |
| `--bg-surface-sunken` / `--bg-surface-inset` | `--muted` (also `--secondary`, `--accent`)               |
| `--text-primary`                             | `--foreground`                                           |
| `--text-secondary` / `--text-tertiary`       | `--muted-foreground` (collapsed to one; 4.56:1 on muted) |
| `--text-on-accent`                           | `--primary-foreground`                                   |
| `--text-link` / `--text-link-hover`          | `--primary-text` / `--primary-hover`                     |
| `--accent-primary` / `-hover` / `-active`    | `--primary` / `--primary-hover` / `--primary-active`     |
| `--accent-secondary` / `-hover`              | `--accent-secondary` / `--accent-secondary-hover`        |
| `--border-default`                           | `--border` (decorative) — **split**, see §4              |
| `--border-strong`                            | `--input` (control boundaries) — **split**               |
| `--focus-ring` / `--shadow-focus`            | `--ring` (solid, `ring-3`)                               |
| `--editable-field-bg` / `-border`            | `--editable` / `--editable-border`                       |
| `--success-bg` / `-fg` / `-border`           | `--success-muted` / `--success` / `--success-border`     |
| `--danger-*`                                 | `--destructive-*`                                        |
| Tag tone "clay"                              | `--primary-muted` / `--primary-border`                   |
| `--container-max`                            | `--container-max` (unchanged)                            |

## 13. Adding a component

1. Check [PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md) §2 for where it goes.
2. Define variants with `cva()` — see `src/components/ui/button.tsx` and `badge.tsx`.
3. Use semantic tokens only. Lint will reject anything else.
4. Anything in `src/components/ui/` must stay **app-agnostic** — it is the future shared
   RedyRef library, and the boundary is enforced in `eslint.config.mjs`. `badge.tsx` knows
   about `success` / `warning` / `info`, not about "Pending Approval". App-specific mappings
   live in `src/components/`.
5. If you add a color, compute its contrast in both modes before committing (§4).
6. The design system §7 specs 19 components; only `Button` and `Badge` (its `StatusPill`) are
   built. Read its spec for the one you're adding rather than inventing it — but translate it
   to `cva()` + semantic tokens. Its inline-style and CDN-Lucide instructions are prototype
   artifacts and do not apply here.
