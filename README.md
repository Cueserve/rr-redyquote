# RedyQuote

> A quoting system REDYREF's sales team can trust — with consistent pricing, enforced approvals, and no silent quote loss, corruption, or duplication.

[![Next.js](https://img.shields.io/badge/Next.js-16.x-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.x-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24_LTS-339933.svg)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Platform-3ecf8e.svg)](https://supabase.com/)

## Project Overview

RedyQuote is REDYREF's internal quoting system, replacing ad-hoc, rep-by-rep pricing with
one tool the sales team can trust. Reps build quotes against a shared product catalog and
component library, with live cost/margin recalculation as they edit, while every quote
moves through a controlled Draft → Review → Approved → Sent lifecycle. It exists
to make a handful of things structurally true — no UI-only approval gate, no data loss on
save, no colliding quote numbers, one consistent pricing formula, a full audit trail —
rather than relying on convention. See [PRODUCT.md](docs/PRODUCT.md) for the full problem
statement, scope, and success criteria.

Under the hood, RedyQuote is a single-tenant Next.js modular monolith on Supabase
(Postgres, Auth). Because every request is an authenticated REDYREF user, there's no
public capture surface to isolate — one runtime role handles both reads (Server
Components) and writes (Server Actions), with atomic Postgres RPC transactions guaranteeing
a quote is never left half-saved — see [ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Key Concepts

- **Quote** — the core object reps build: a product, fab tier, and set of components,
  moving through Draft → Review → Approved → Sent. No other lifecycle exists, and
  every status change writes an audit row.
- **Fab tier** — the fabrication cost for a product at a given order quantity (cost, quoted
  date, vendor). Reps always price against a tier, never a single flat product cost.
- **Component library** — reusable, categorized components (environment: Any/Indoor/
  Outdoor) that plug into a quote line. A cost change appends to `price_history` instead of
  overwriting it, so nothing is lost.
- **RLS-enforced authorization** — writes are enforced at the database, not the UI. The
  `Review → Approved` transition and all master-data / settings / branding writes
  are restricted to `role = 'admin'`; quote content edits are owner-or-admin; reads are flat.
  A bypassed or scripted client is still denied. (admin-owns-master-data model, PRD §7A)
- **Atomic multi-row save** — saving a quote (header + line items) or a product (fab tiers +
  defaults + price history) goes through a single Postgres RPC transaction, so a failure
  partway through never leaves a row half-written.
- **Server-side pricing trust boundary** — the quote builder recalculates live in the
  browser for UX, but the Server Action recomputes the canonical cost breakdown from stored
  data at save time; the client's numbers are never trusted as the value that gets
  persisted.

## Prerequisites

- Node.js 24 LTS (Active LTS) — pinned in `.nvmrc`; `nvm use` picks it up
- npm (bundled with Node.js 24 LTS) — the only approved package manager; do not use pnpm
  or yarn
- Supabase CLI (latest, via `npx supabase`) — for migrations and type generation
- **No Docker required.** Development runs against a hosted Supabase project, not the local
  stack — see [ENVIRONMENTS.md](docs/ENVIRONMENTS.md)
- Git
- A Supabase account and project (Postgres 17) — no `pgmq`, `pg_cron`, or Edge Functions
  needed; RedyQuote has no unauthenticated capture pipeline to isolate
- A Vercel account (hosts the Next.js app)

No optional accounts. Resend, Sentry, and PostHog are all deliberately cut for v1
(TECH-STACK.md §5) — there's no email/PDF delivery, and no error-tracking or
product-analytics need for a single internal tool.

## Environment Setup

```bash
cp .env.example .env.local
```

Then fill both values. Secrets MUST NOT be committed. Both variables are public by design —
they are inlined into the browser bundle, and access control is enforced by Postgres RLS, not
by hiding them ([ARCHITECTURE.md](docs/ARCHITECTURE.md) §1). A server-only secret MUST NOT
carry the `NEXT_PUBLIC_` prefix.

| Variable                        | Required | Description                                          | Where to obtain                             |
| ------------------------------- | -------- | ---------------------------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | yes      | Supabase project URL; safe to expose to the browser. | Supabase dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes      | Anonymous key for user-scoped, RLS-enforced access.  | Supabase dashboard → Project Settings → API |

There is deliberately **no service-role key**. RedyQuote uses none anywhere
([TECH-STACK.md](docs/TECH-STACK.md) §7) — every database access runs under a real user's
session. Adding one is a TECH-STACK change first.

## Install & Run

```bash
npm install
cp .env.example .env.local   # fill in the two values from Supabase → Project Settings → API
npm run dev                  # http://localhost:3000
```

## Everyday Checks

These five are exactly what CI runs on every PR to `main` and every push to `main`
([.github/workflows/ci.yml](.github/workflows/ci.yml)):

```bash
npm run lint
npm run typecheck
npm run format:check
npm run test                 # see the caveat below
npm run build
```

`npm run test` runs the unit suites under `src/lib/`. `vitest.config.ts` sets no
`passWithNoTests`, so an empty suite fails rather than passing silently — a green run means the
tests actually ran.

Fonts are Archivo (all text) and IBM Plex Mono (tabular numerics only), self-hosted via
[`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) — no
external request, no layout shift. See [DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) §8.

## Claude Code Setup

Optional — skip it if you don't use Claude Code. The repo declares three shared plugins so
every developer gets the same UI/UX guidance instead of whatever they happen to have installed
locally.

**Nothing to run.** `.claude/settings.json` declares the marketplaces, enables all three, and
pins impeccable's context directory to `docs/` (`IMPECCABLE_CONTEXT_DIR`) so it reads
[PRODUCT.md](docs/PRODUCT.md) from there. Claude Code reads it on open and prompts you to trust
the workspace; accept, and the plugins install themselves.

| Plugin                                    | Job                                                    |
| ----------------------------------------- | ------------------------------------------------------ |
| `frontend-design@claude-plugins-official` | Optional taste input on a new screen. Picks no values. |
| `impeccable@impeccable`                   | **`shape` + audit only.** Never builds UI.             |
| `superpowers@claude-plugins-official`     | Process guidance. Not a design tool.                   |

Sources: [frontend-design](https://github.com/anthropics/claude-plugins-official) and
[superpowers](https://github.com/anthropics/claude-plugins-official) (Anthropic) ·
[impeccable](https://github.com/pbakaus/impeccable) (Apache 2.0)

**No plugin builds UI here — shadcn does.** This is a shadcn project ([components.json](components.json),
`shadcn@4`), and the primitives in `src/components/ui/` are shadcn components adapted to our
tokens. Reuse or extend one before running `npx shadcn@latest add`. The order on any UI change
is **`/impeccable shape` → design system → shadcn → impeccable audit → `npm run lint` +
`npm run typecheck`**; [CLAUDE.md](CLAUDE.md)'s "Building UI" section is the authority.

**Starting new UI-bearing work? `/impeccable shape` is required, not optional** — a new route,
screen, or user-facing component begins with a shape brief you have explicitly confirmed.
`/impeccable craft` is **banned**: it builds as well as plans, and nothing in impeccable writes
UI here. Backend-only work (migration, Server Action, `src/lib/` module) is exempt. CLAUDE.md
"Building UI" step 1 has the full rule, including how this orders against
`superpowers:brainstorming`.

Five things to know:

- **No plugin overrules this repo's design system.** [DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)
  and the semantic tokens in `src/app/globals.css` win every time, and `eslint.config.mjs`
  rejects a hex literal or a raw Tailwind color class on sight. A suggestion that fails
  `npm run lint` was never a valid suggestion.
- **`npx shadcn add` output passes lint by construction.** shadcn names its tokens exactly as
  `globals.css` defines them (`background`, `card`, `primary`, `muted`, `border`, `ring`,
  `chart-1`–`5`, `sidebar-*`). Read the diff anyway — a hardcoded color in generated output is
  a bug, not a starting point.
- **The impeccable baseline is clean, and contrast is its blind spot.** `npx impeccable detect src/`
  returns zero findings (verified 2026-08-05, v3.5.0) — `eslint.config.mjs` already bans the raw
  palette classes most of its detectors key on. But its contrast rules need two resolved colors,
  and our semantic tokens resolve at runtime, so a source scan **skips** the WCAG AA check rather
  than passing it. For real contrast coverage, audit the rendered page: `npm run dev`, then
  `npx impeccable detect http://localhost:3000/<route>` — nothing to install, since `npx` pulls
  `puppeteer` in as one of impeccable's optional dependencies. Never add it to `package.json`.
- **A new finding is a real finding.** Because the baseline is empty, anything impeccable
  reports got past `npm run lint` and deserves a fix, not a suppression. If you do establish a
  finding contradicts [DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md), suppress it with
  `npx impeccable ignores add-rule <rule>` — never by changing a token.
- **Don't install the same tool twice.** All three come from the plugin system. If you
  previously installed one by hand (`npx impeccable skills install` or `claudekit`), delete the
  local copy so you aren't loading two versions of one skill.

`.impeccable/config.local.json` is gitignored: per-developer overrides are machine state, not
source. Nothing else here is. Plugins install to `~/.claude/plugins/cache/`, outside the repo,
so there is no local payload to ignore — a `.claude/skills/` directory should not exist, and if
one appears you hand-installed something (see the bullet above) and it **will** be committed.

`.impeccable/config.json` **is** committed, because a suppression is a team decision. It holds
one: `cramped-padding`, which misfires on the data table's scroll container (the rationale is in
the file's `$comment`). That suppression is repo-wide, since the tool has no per-file scope for
rules — run `npx impeccable detect src/ --no-config` to see what it hides.

You can also run the auditor outside Claude Code:

```bash
npx impeccable detect src/          # exit 0 = clean, exit 2 = findings
npx impeccable detect --json src/   # machine-readable, for CI
```

## Documentation Audit — `/doc-audit`

This repo is built against its docs: `CLAUDE.md` and `docs/` are loaded into Claude Code's context
and drive what gets written. A stale line there isn't a typo — it's a wrong instruction that ends
up in code. `/doc-audit` ([.claude/commands/doc-audit.md](.claude/commands/doc-audit.md)) reads the
whole doc corpus once and checks it three ways.

| Pass          | Question it answers                                                          | Run it as           |
| ------------- | ---------------------------------------------------------------------------- | ------------------- |
| **A. Align**  | Do terms, metrics, goals, and acceptance criteria cohere? What's missing?    | `/doc-audit align`  |
| **B. Drift**  | Do the docs contradict each other, or contradict the code?                   | `/doc-audit drift`  |
| **C. Absorb** | Is the same fact written twice? Which copy is better? Can a spec be deleted? | `/doc-audit absorb` |

**The letters are the run order.** `/doc-audit` with no argument runs all three, A → B → C, in one
report.

Start with `align` because it builds the terminology register — once concept names are settled, the
other two passes produce sharper findings. Run `drift` next, since it's the pass that catches
instructions that would produce wrong code. Save `absorb` for last: it's the only pass that proposes
deleting files, and it's the least useful while terms are still unsettled.

**When to run it:** after landing a spec, after applying a migration, after any `docs/` edit, and
before starting a feature that spans several docs. It's a read-heavy command — it's not a
pre-commit check.

Other arguments, combinable:

```bash
/doc-audit docs-only          # skip all code probes — fast, prose only
/doc-audit fix                # apply the Safe fix tier (README, dead links, stale dates)
/doc-audit align docs/PRD.md  # scope to one file
```

**What it will and won't change.** Fixes are split in two tiers:

- **Safe** — `README.md` wording, broken relative links, stale date stamps. Applied only when you
  pass `fix`. README owns no facts, so correcting it is transcription, not a decision.
- **Approval** — anything touching `docs/`, `CLAUDE.md`, or `.claude/settings.json`, every
  terminology rename, and **every Pass C finding**. These are shown as a diff and stop for your
  approval, even under `fix`. Editing a source-of-truth doc is a deliberate decision
  ([CLAUDE.md](CLAUDE.md), "Editing source-of-truth docs") — the audit proposes, you decide.

**Reading the output.** Each finding carries two ratings, because they're different questions:
`P0`–`P2` is correctness (would following this produce wrong code?) and `High`/`Medium`/`Low` is
product impact (what does it cost a user or an engineer?). A finding can be `P2 · High`.

## Project Structure

The UI is built end to end but **not yet wired to the database**: every screen reads from
fixtures in `src/lib/mock/`, and no Server Action exists, so the app has no write path at all.
See [PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md) for the full directory tree, which marks
what is built, what is not, and which two directories are prototype scaffolding due for
deletion.

## Further Reading

- [PRODUCT.md](docs/PRODUCT.md) — problem statement, scope, success criteria
- [PRD.md](docs/PRD.md) — requirements and feature scope
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — system structure and design decisions
- [DATABASE.md](docs/DATABASE.md) — the data model: entities, ERD, columns, and why each table
  is shaped that way. The SQL that implements it is a
  [spec](docs/DATABASE-SQL.md), now **partly** authored as
  migrations — that file's "Transcription status" says which blocks it no longer governs.
- [TECH-STACK.md](docs/TECH-STACK.md) — approved technologies and usage rules
- [PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md) — directory layout and file-placement rules
- [DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) — brand tokens, the semantic-token rule, the WCAG AA floor
- [ENVIRONMENTS.md](docs/ENVIRONMENTS.md) — which Supabase environment dev runs against, and why

## Open Decisions

Two product decisions gate real work, and neither is a coding task:

- **Pricing formula and rounding rules** (PRD §7A) — until signed off, nothing may infer a
  calculation order or which fields are canonical. The quote builder's cost panel is
  deliberately inert as a result.
- **The fixed quote-line category list** (PRD-007A) — the `categories` table ships empty and
  the UI uses clearly-marked placeholders.

Tracked in [DATABASE.md](docs/DATABASE.md) §6.

---

> _Last updated:_ 2026-08-08 · _Owner:_ Viral Parikh
