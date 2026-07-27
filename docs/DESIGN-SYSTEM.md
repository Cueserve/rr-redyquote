# DESIGN-SYSTEM.md — Brand Tokens & UI Rules

**Owner:** Viral Parikh
**Last updated:** 2026-07-27
**Source of truth for:** RedyQuote's design tokens, the rules for using them, and the
accessibility floor every color must clear.

> Derived from: the REDYREF logo and redyref.com, the proposal-system prototype, docs/TODO.md §7
> Implemented in: `src/app/globals.css`, `src/app/layout.tsx`, `eslint.config.mjs`

---

## 1. Where the brand values came from

These were derived from source, not chosen:

| Value                         | Source                                                                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand red **`#ad0000`**       | Decoded from `Final-RedyRef_logo_main.png` — the logo contains exactly two colors, `#ad0000` and `#000000`. Confirmed as the interactive color (buttons, links, borders) in redyref.com's Oxygen stylesheets. |
| **Barlow / Barlow Condensed** | The proposal-system prototype (`redyref-proposal-system.vercel.app`).                                                                                                                                         |
| Neutral ramp, radius scale    | Same prototype.                                                                                                                                                                                               |

**Montserrat was rejected**, despite being the only family on redyref.com. It is a wide
geometric sans; the quote builder is a dense grid of numeric columns, and Barlow — a narrow
grotesk — fits the same columns without shrinking the type. Brand recognition lives in the
logo and the red, not the body font.

**The prototype's orange `#e05e1a` was rejected.** It appears nowhere in RedyRef's brand. The
prototype shipped the red-and-black logo above an orange UI; that was a mock's arbitrary choice,
not a brand decision.

## 2. The three tiers

| Tier                   | Where                                         | May components use it?                            |
| ---------------------- | --------------------------------------------- | ------------------------------------------------- |
| 1 — Brand primitives   | `:root` in `globals.css`, **not** in `@theme` | **No.** Tailwind emits no utility for them.       |
| 2 — Semantic tokens    | `@theme inline` in `globals.css`              | **Yes — these are the only color names allowed.** |
| 3 — Component variants | `cva()` in `src/components/ui/`               | Yes.                                              |

Tier 1 being outside `@theme` is deliberate and load-bearing: Tailwind only generates
utilities for `@theme` entries, so `bg-brand-red-600` **does not exist as a class**. A
primitive cannot be reached from a component even by accident.

## 3. The one rule: semantic tokens only

Components use `bg-background`, `text-muted-foreground`, `bg-primary`, `border-border`,
`text-success` — never `bg-zinc-50`, `text-black`, or `bg-[#ad0000]`. Raw palette classes and
hex literals bypass the token layer: they don't flip in dark mode and they don't re-theme when
a brand value changes.

This is **enforced, not documented**, in two layers:

1. Tier-1 primitives generate no utilities (above).
2. `no-restricted-syntax` in `eslint.config.mjs` rejects raw palette classes and hex literals
   in `className` strings and template literals across `src/**/*.tsx`.

Same philosophy as the RLS approval gate and the `ui/` boundary rule — if it matters, the build
enforces it.

## 4. Accessibility floor

**Every color clears WCAG AA (4.5:1) in every role it is used in.** This is a floor, not an
aspiration — the prototype's palette did not meet it and was re-stepped rather than copied:

| Prototype value              | Contrast on white | Used at | Status     |
| ---------------------------- | ----------------- | ------- | ---------- |
| `--faint #8b93a1`            | 3.09:1            | 11px    | **Failed** |
| `--green #1e9e54` (Approved) | 3.46:1            | 11px    | **Failed** |
| `--amber #b07d14` (Pending)  | 3.63:1            | 11px    | **Failed** |
| `--blue #2c7fc2` (Sent)      | 4.27:1            | 11px    | **Failed** |

Each hue was re-solved for the **lightest step that still clears 4.5:1 in both roles** it
serves — as ink on a page surface, and as a solid fill carrying white text:

| Token                | Light                      | As ink | Under white |
| -------------------- | -------------------------- | ------ | ----------- |
| `--primary`          | `oklch(0.469 0.193 29.2)`  | 7.56:1 | 7.25:1      |
| `--destructive`      | `oklch(0.564 0.182 25.1)`  | 5.02:1 | 4.80:1      |
| `--success`          | `oklch(0.520 0.153 151.9)` | 5.05:1 | 4.84:1      |
| `--warning`          | `oklch(0.544 0.125 78.6)`  | 5.05:1 | 4.84:1      |
| `--info`             | `oklch(0.540 0.130 247.1)` | 5.03:1 | 4.82:1      |
| `--muted-foreground` | `oklch(0.526 0.023 261.7)` | 5.37:1 | —           |

`--muted-foreground` is solved against `--muted` (the darkest light surface it can land on),
not against white, so it holds AA everywhere: **4.52:1** on muted, **4.84:1** on the canvas,
**5.37:1** on a card.

**When adding or changing a color, compute the contrast — do not eyeball it.**

## 5. Decisions worth not re-litigating

**Red is the primary, and destructive is a different red.** RedyQuote is status-heavy
(Draft / Pending Approval / Approved / Sent, margin ok/warn/bad, delete line item), so a brand-red
CTA risks reading as the same signal as danger. Resolved by contrast and affordance rather than
by giving up the brand: `--primary` is the deep `#ad0000` solid fill, `--destructive` is a
lighter `#cb3a3a` used as a **tint, never a solid fill** (see `button.tsx`). A primary CTA and
a destructive action never look like siblings.

**Dark mode splits brand red into two tokens.** No single lightness works on a dark surface: a
fill dark enough to carry white text (L .58 → 4.51:1) reads only 3.72:1 as ink, and ink light
enough to pass (L .68 → 5.58:1) drops white-on-fill to 3.14:1. So `--primary` is the fill and
**`--primary-text`** is brand red used _as_ ink. In dark mode use `text-primary-text` for links
and active nav, never `text-primary`. In light mode the two are the same value.

**`--accent` stays neutral.** shadcn uses it for every generic hover, so tinting it red would
put brand color on every dropdown row. The red tint is scoped to active nav
(`bg-primary/10 text-primary-text`), exactly how the prototype scopes its `--orange-dim`.

**`--muted` / `--secondary` / `--accent` are darker than `--background`.** A recessed surface
that is lighter than the page canvas reads inside-out. These recede correctly whether they sit
on a white card or on the grey canvas.

**`--radius` is unchanged at `0.625rem`.** The `calc()` chain already yields sm 6px / md 8px /
lg 10px, matching the prototype's controls and panels exactly. Don't "fix" it.

## 6. Chart series

`--chart-1..5` is a **categorical** palette: fixed order, never cycled, color follows the
entity and never its rank. Ordered so the two closest hues are not adjacent. Both modes are
validated against the lightness band, chroma floor, colorblind separation, and surface
contrast — light mode's worst adjacent pair is deutan ΔE 14.8, dark's is 12.3, and every step
clears 3:1 on its surface. Dark values are **re-stepped into the dark band (L 0.48–0.67)**, not
flipped from light.

Status colors are reserved and are never reused as a series color. A 6th series is not a
generated hue — fold it into "Other", facet it, or use small multiples.

## 7. Typography

| Token            | Family           | Use                                       |
| ---------------- | ---------------- | ----------------------------------------- |
| `--font-sans`    | Barlow           | UI, body, tables (the default on `html`)  |
| `--font-heading` | Barlow Condensed | `h1`–`h3`, large stat and margin readouts |
| `--font-mono`    | Geist Mono       | Currency and quantities                   |

All three are self-hosted by `next/font/google` — no external request, no layout shift.

**Money and quantities use `font-mono tabular-nums`** so figures don't jitter as digits change.
Both are stock Tailwind utilities; there is no custom class for it.

## 8. Adding a component

1. Check [PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md) §2 for where it goes.
2. Define variants with `cva()` — see `src/components/ui/button.tsx` and `badge.tsx`.
3. Use semantic tokens only. Lint will reject anything else.
4. Anything in `src/components/ui/` must stay **app-agnostic** — it is the future shared
   RedyRef library, and the boundary is enforced in `eslint.config.mjs`. `badge.tsx` knows
   about `success` / `warning` / `info`, not about "Pending Approval". App-specific mappings
   live in `src/components/`.
5. If you add a color, compute its contrast in both modes before committing (§4).
