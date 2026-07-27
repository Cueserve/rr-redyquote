# TODO — Structure-review hardening plan

**Created:** 2026-07-26 (from project-structure review)
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
- [ ] [7. Brand design tokens](#7-brand-design-tokens--blocked-on-input-redyref-brand-values) — **blocked:** needs RedyRef brand values from Viral
- [x] [8. Fix Zod version drift in TECH-STACK.md](#8-zod-version-drift) — signed off by Viral; doc updated to 4.x
- [x] [9. Make `docs/superpowers/specs/` visible](#9-make-docssuperpowersspecs-visible--keep-the-path-fix-the-visibility) — signed off by Viral; rename rejected, visibility fixed instead

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

### 7. Brand design tokens — **blocked on input: RedyRef brand values**

- Replace the neutral oklch values in `:root` and `.dark` in `src/app/globals.css`
  (`--primary`, `--accent`, `--radius`, fonts) with RedyRef brand values. One edit
  themes every current and future component.
- Team rule from day one: components use **semantic tokens only**
  (`bg-background`, `text-muted-foreground`, `bg-primary`) — never raw palette
  classes (`bg-zinc-50`, `text-black`). Raw colors bypass theming and break dark mode.
- New `ui/` components define variants via `cva()` (pattern already in `button.tsx`).

**Needs from Viral:** RedyRef brand colors (hex is fine, convert to oklch), preferred
radius, font choice.

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

---

## C. Deferred — do at the trigger, not before

1. **Boilerplate deletion** — `public/next.svg`, `public/vercel.svg`, `public/file.svg`,
   `public/globe.svg`, `public/window.svg`, and the create-next-app content of
   `src/app/page.tsx` → delete when the first real route lands.
2. **Playwright wiring** — `playwright.config.ts`, `e2e/`, `test:e2e` script, and the
   advisory nightly CI job → when the first E2E spec is written (quote flow exists).
3. **`src/hooks/`** — shadcn will auto-create it when a component ships a hook (e.g.
   sidebar). Allow it when that happens and update `docs/PROJECT-STRUCTURE.md` in the
   same change (its §6 rule).

## D. Deferred — app #2 packaging decision (do NOT decide now)

When a second RedyRef app is concrete, pick one:

| Option                  | Trade-off                                                         |
| ----------------------- | ----------------------------------------------------------------- |
| Template repo           | Zero overhead now; fixes don't propagate between apps             |
| Private shadcn registry | shadcn-native sharing, no monorepo; updates = re-run `shadcn add` |
| npm workspace monorepo  | True single-version sharing; highest daily complexity for 3 devs  |

The §A.4 boundary rule keeps all three options cheap. Revisit then.
