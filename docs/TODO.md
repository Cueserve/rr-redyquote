# TODO — Structure-review hardening plan

**Created:** 2026-07-26 (from project-structure review)
**Last updated:** 2026-07-31
**Status:** working checklist — delete this file when all items are done or moved.
**Scope:** the "do now" items only. Packaging/shared-library decision is deferred to app #2 (§D).

Order matters: 1→7 build on each other (CI calls the scripts created in 1–4).

---

## Checklist

Tick the box in the same PR that completes the item. To migrate to GitHub Issues later,
paste this block into a new issue — each `- [ ]` line converts to its own issue in one click.

- [x] [1. Add missing npm scripts](#1-add-missing-npm-scripts)
- [ ] [2. Minimal Vitest config](#2-minimal-vitest-config)
- [x] [3. Install Prettier + Husky + lint-staged](#3-install-prettier--husky--lint-staged-tech-stack-4--approved-not-yet-installed)
- [x] [4. ESLint boundary rule for `src/components/ui/`](#4-eslint-boundary-rule--keep-srccomponentsui-app-agnostic)
- [x] [5. `.env.example`](#5-envexample) — already existed and verified
- [ ] [6. CI workflow + branch protection](#6-ci-workflow-tech-stack-3--blocking-job)
- [x] [7. Brand design tokens](#7-brand-design-tokens) — superseded by the Proposal System design system (Clay / Stone / Moss)
- [x] [8. Fix Zod version drift in TECH-STACK.md](#8-zod-version-drift) — signed off by Viral; doc updated to 4.x
- [x] [9. Make `docs/superpowers/specs/` visible](#9-make-docssuperpowersspecs-visible--keep-the-path-fix-the-visibility) — signed off by Viral; rename rejected, visibility fixed instead
- [x] [10. Split `docs/DATABASE.md` into model + DDL](#10-split-docsdatabasemd-into-model--ddl) — signed off by Viral; permanent model doc + transient SQL spec

§C/§D items are deliberately not here — they have triggers, not checkboxes. Add them to
this list (or as issues) only when their trigger fires.

---

## A. Do now — tooling and enforcement

### 1. Add missing npm scripts

Edit `package.json` → `scripts`:

```json
"typecheck": "tsc --noEmit",
"test": "vitest run",
"format": "prettier --write .",
"format:check": "prettier --check ."
```

Do **not** add `test:e2e` yet — no `e2e/` and no Playwright config exists (see §C.2).

**Done when:** `npm run typecheck` passes.

### 2. Minimal Vitest config

Create `vitest.config.ts` at repo root:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
  },
});
```

Remove `passWithNoTests` when the first real test lands (pricing calc), so an
accidentally-empty test glob fails instead of passing silently.

> **Note (item 1 landed first):** because this config was skipped, the `test` script
> currently carries the flag inline — `vitest run --passWithNoTests`. When this config
> lands, move `include` + `passWithNoTests` into it and drop the flag from the script.

**Done when:** `npm run test` exits 0.

### 3. Install Prettier + Husky + lint-staged (TECH-STACK §4 — approved, not yet installed)

```bash
npm i -D prettier husky lint-staged
```

```bash
npx husky init
```

- Create `.prettierrc` → `{}` (defaults; don't bikeshed options).
- Create `.prettierignore`:

  ```text
  .next
  package-lock.json
  ```

- Replace `.husky/pre-commit` contents with: `npx lint-staged`
- Add to `package.json`:

  ```json
  "lint-staged": {
    "*.{ts,tsx,mjs}": ["eslint --fix", "prettier --write"],
    "*.{css,md,json}": ["prettier --write"]
  }
  ```

- Run `npm run format` once and commit the reformat separately (keeps the diff noise
  out of functional commits).

**Done when:** a staged `.ts` file with a format error gets fixed automatically on commit.

### 4. ESLint boundary rule — keep `src/components/ui/` app-agnostic

Add to the flat-config array in `eslint.config.mjs`:

```js
{
  files: ["src/components/ui/**"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [{
        group: ["@/server/*", "@/lib/supabase/*", "@/app/*"],
        message: "ui/ must stay app-agnostic — it is the future shared RedyRef library.",
      }],
    }],
  },
},
```

This is the extraction boundary for the future shared component library. Enforced by
lint, not convention — same philosophy as RLS.

**Done when:** a test import of `@/lib/supabase/client` inside `src/components/ui/button.tsx`
fails `npm run lint` (then revert the test import).

### 5. `.env.example`

Create at repo root (names + comments only — never real values):

```bash
# Supabase — hosted dev project (see docs/ENVIRONMENTS.md for which environment)
# Values: Supabase dashboard → Project Settings → API. Both are public-safe (anon key only).
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Verify `.gitignore` covers `.env*` but **not** `.env.example`.

**Done when:** a new clone can `cp .env.example .env.local` and know exactly what to fill in.

### 6. CI workflow (TECH-STACK §3 — blocking job)

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run format:check
      - run: npm run test
```

The advisory/nightly Playwright job waits until `e2e/` exists (§C.2).

**Done when:** the workflow passes on a PR. Then enable branch protection on `main`
requiring the `check` job (GitHub → Settings → Branches).

### 7. Brand design tokens

**Done — then superseded on 2026-07-27.** See
[DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) for the current system; this entry is kept as the record
of how the token layer got here.

**The palette shipped now comes from the REDYREF Proposal System design system** (Clay / Stone
/ Moss, Archivo + IBM Plex Mono), authored in Claude design and adopted wholesale. It is a
design for an _internal_ estimating tool and is deliberately not the public marketing brand.

The first pass derived everything from the marketing brand instead — **brand red `#ad0000`**
decoded from `Final-RedyRef_logo_main.png` and confirmed in redyref.com's Oxygen stylesheets,
with **Barlow + Barlow Condensed** from the proposal-system prototype. None of those values
survive. That derivation was not wrong; it was answering a different question.

**What carried forward from the first pass**, because it turned out to be structural rather
than cosmetic:

- **The three-tier token architecture.** Tier-1 primitives declared in `:root` but kept out of
  `@theme`, so Tailwind emits no utility for them — `bg-clay-600` does not exist. Plus the
  `no-restricted-syntax` rule in `eslint.config.mjs` rejecting raw palette classes and hex
  literals. "Semantic tokens only" stayed **enforced, not documented**.
- **The measure-don't-eyeball rule.** The new palette needed it too: 24 of the 27 pairs it
  specifies pass as written, but three of its tokens fail in the roles it assigns them
  (`--border-default` at 2.78–2.91:1 on the surfaces it actually sits on, `--focus-ring` at
  2.74–3.05:1, `--editable-field-border` at **1.90:1** while carrying a load-bearing meaning).
  All three were re-solved. 88 pairs are now checked across both modes.
- **`--destructive` as a tint, never a solid fill.** Re-justified with a new number: a solid
  danger fill sits OKLab ΔE 5.3 from the primary clay fill, less separation than primary has
  from its own hover step (ΔE 7.0).
- **Dark tokens authored now, no theme toggle shipped.** The design system is light-only, so
  the entire dark band is derived and measured here rather than designed.
- **A validated categorical `--chart-*` set**, re-anchored on clay and moss.

**`--radius` is no longer a `calc()` chain.** The design system's ladder is 6 → 10 → 16 → 22px,
which is not a constant multiple; it is now an explicit scale.

`src/app/page.tsx` was a token reference surface until 2026-07-31; it is now the entry
redirect, deleted as part of §C.1 when the first real routes landed.

---

## B. Doc fixes — deliberate `docs/` edits, need explicit sign-off (project CLAUDE.md rule)

### 8. Zod version drift

**Resolved — doc updated to 4.x, package unchanged at `^4.4.3`.** Signed off by Viral.

`docs/TECH-STACK.md` §4 pinned Zod **3.x** while `package.json` had **^4.4.3** (4.4.3
installed). Downgrading was never viable: the only Zod code in the repo,
`src/lib/config.ts`, already uses the v4 API — `z.url()` is Zod 4's top-level string
format, which in v3 was `z.string().url()`. The doc was the stale side of the drift.

### 9. Make `docs/superpowers/specs/` visible — **keep the path, fix the visibility**

**Superseded the original item.** That item proposed
`git mv docs/superpowers/specs docs/specs` to get tool jargon out of the path. Rejected:
`superpowers` is an installed, globally-enabled Claude Code plugin
(`claude-plugins-official@5.1.0`) whose skills hardcode the output paths —
`brainstorming` writes `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`, `writing-plans`
writes `docs/superpowers/plans/`. Renaming wins a nicer path once, then the next run
recreates the folder and specs end up split across two directories. Worse than the problem.

The real risk was never the name. It was that
`2026-07-23-authorization-matrix-design.md` — status **Approved**, **amends** PRD-010 and
ARCHITECTURE §2/§7 — was not in CLAUDE.md's source-of-truth list, so an agent following that
list would write RLS policies against superseded PRD text.

Fixed by:

- **CLAUDE.md** — new "Approved design specs" block listing the authorization-matrix spec with
  what it amends, plus the rule to add future specs to that list in the same change.
- **docs/PROJECT-STRUCTURE.md §1** — `docs/superpowers/{specs,plans}/` shown in the tree,
  marked tool-owned.
- **docs/PROJECT-STRUCTURE.md §5** — a "Docs" naming convention recording that this is the one
  deliberately tool-named path, and why renaming it is a trap.

Files stayed where they were; no `git mv`.

### 10. Split `docs/DATABASE.md` into model + DDL

**Done 2026-07-31.** Signed off by Viral. The file was 66K, referenced by nothing, and used a
header format (`Author` / `Target` / `Status`) that no other doc uses — it never declared
itself a source of truth, and no list pointed at it, so an agent following CLAUDE.md would
design against ARCHITECTURE §2's four-line summary table instead of the real schema.

Three options were weighed: promote it whole, list it as a spec with an expiry, or split it.
**Split won** because the file is two documents with opposite lifespans. Entities, ERD, column
tables, and design rationale are permanent. The DDL is not: ARCHITECTURE §5 makes
`supabase/migrations/*.sql` the authoritative schema, so once migrations exist, any SQL kept
alongside them is a second copy free to drift.

- **`docs/DATABASE.md`** — §1–§4 unchanged, plus a new §5 (Design Decisions) and §6 (Open
  Items) carrying the durable half of the old §8. Permanent; now listed in CLAUDE.md.
- **`docs/DATABASE-SQL.md`** — SQL, RPCs, RLS (renumbered §1–§3) plus §4 Implementation Notes.
  Transient; listed under CLAUDE.md's "Approved design specs" with a delete-on-authoring rule.

Verified lossless: SQL statement counts match across the split (13 tables, 31 policies, 16
triggers, 22 indexes, 4 types), and a line diff of both halves against the original shows only
the intended heading renumbers and cross-reference repoints.

**On placement** — `DATABASE-SQL.md` sits at the top level, not under
`docs/superpowers/specs/`, and that refines item 9 above rather than contradicting it. Item 9
kept the tool-named path because the plugin _recreates_ it; that futility argument applies to
plugin output only, not to a hand-authored file nothing would regenerate. PROJECT-STRUCTURE.md
§5 now says this explicitly, and CLAUDE.md's spec block was generalized so a spec's authority
no longer reads as a property of which folder it is in.

---

## C. Deferred — do at the trigger, not before

1. ~~**Boilerplate deletion**~~ — **done 2026-07-31.** The trigger fired when the real routes
   landed: `src/app/page.tsx` became the entry redirect, and `public/{next,vercel,file,globe,
window}.svg` were deleted after confirming nothing outside this file referenced them. That
   left `public/` empty, so it no longer exists in a fresh clone — intentional, see
   PROJECT-STRUCTURE.md §1.
2. **Playwright wiring** — `playwright.config.ts`, `e2e/`, `test:e2e` script, and the
   advisory nightly CI job → when the first E2E spec is written (quote flow exists).
   `@playwright/test` is already a devDependency; the config and specs are not.
3. **`src/hooks/`** — shadcn will auto-create it when a component ships a hook (e.g.
   sidebar). Allow it when that happens and update `docs/PROJECT-STRUCTURE.md` in the
   same change (its §6 rule).
4. **Prototype scaffolding removal** — `src/lib/mock/` and `src/components/prototype/` →
   delete when Server Components read real data and Supabase Auth gates `(app)/layout.tsx`.
   Both are quarantined in named folders so each is one `rm -r`. The role switch in
   `prototype/` is the urgent half: it is an affordance toggle that must never be mistaken
   for authorization, which is RLS's job (NFR-002).
5. **`/quotes/[id]` returns 200 on a bad id** — `quotes/loading.tsx` puts the whole `quotes/`
   subtree behind a Suspense boundary, so the response status commits before `notFound()`
   runs. The 404 page renders; the status code is wrong. `products/[id]` and `library/[id]`
   are correct because they have no loading boundary. Fixing it means separating the list's
   loading UI from the detail routes → do it when that segment is restructured, and update
   `docs/PROJECT-STRUCTURE.md` §1 in the same change (the caveat there records the finding).

## D. Deferred — app #2 packaging decision (do NOT decide now)

When a second RedyRef app is concrete, pick one:

| Option                  | Trade-off                                                         |
| ----------------------- | ----------------------------------------------------------------- |
| Template repo           | Zero overhead now; fixes don't propagate between apps             |
| Private shadcn registry | shadcn-native sharing, no monorepo; updates = re-run `shadcn add` |
| npm workspace monorepo  | True single-version sharing; highest daily complexity for 3 devs  |

The §A.4 boundary rule keeps all three options cheap. Revisit then.
