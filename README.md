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
moves through a controlled Draft → Pending Approval → Approved → Sent lifecycle. It exists
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

- **Quote** — the core object reps build: a product, quantity tier, and set of components,
  moving through Draft → Pending Approval → Approved → Sent. No other lifecycle exists, and
  every status change writes an audit row.
- **Fab tier** — the fabrication cost for a product at a given order quantity (cost, quoted
  date, vendor). Reps always price against a tier, never a single flat product cost.
- **Component library** — reusable, categorized components (environment: Any/Indoor/
  Outdoor) that plug into a quote line. A cost change appends to `price_history` instead of
  overwriting it, so nothing is lost.
- **RLS-enforced authorization** — writes are enforced at the database, not the UI. The
  `Pending Approval → Approved` transition and all master-data / settings / branding writes
  are restricted to `role = 'admin'`; quote content edits are owner-or-admin; reads are flat.
  A bypassed or scripted client is still denied. (admin-owns-master-data model, PRD §2A)
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

## Install & Run

```bash
npm install
cp .env.example .env.local   # fill in the two values from Supabase → Project Settings → API
npm run dev                  # http://localhost:3000
```

Everyday checks — all four are what CI will run:

```bash
npm run lint
npm run typecheck
npm run format:check
npm run test                 # see the caveat below
npm run build
```

Two caveats worth knowing before you trust a green run:

- **`npm run test` proves nothing yet.** It is `vitest run --passWithNoTests` and there are no
  tests, so it exits 0 on an empty suite. Read a pass as "not run" until the pricing-calc
  tests land ([TODO.md](docs/TODO.md) §A.2).
- **The migrations exist but have not been applied.** `supabase/migrations/0001`–`0003` are
  authored and unpushed, so the hosted database is still empty: `npm run db:types` regenerates
  types for nothing until `npm run db:push` runs. `0004` onward (products, quotes, RPCs) is
  still a spec — see [DATABASE-SQL.md](docs/DATABASE-SQL.md)'s "Transcription status".

Fonts are Archivo (all text) and IBM Plex Mono (tabular numerics only), self-hosted via
[`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) — no
external request, no layout shift. See [DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) §8.

## Claude Code Setup

Optional — skip it if you don't use Claude Code. The repo declares three shared plugins so
every developer gets the same UI/UX guidance instead of whatever they happen to have installed
locally.

**Nothing to run.** `.claude/settings.json` declares the marketplaces and enables all three.
Claude Code reads it on open and prompts you to trust the workspace; accept, and the plugins
install themselves.

Each layer has one job, and they are not interchangeable:

| Layer               | Plugin                                    | Job                                                       |
| ------------------- | ----------------------------------------- | --------------------------------------------------------- |
| 1 — Guardrails      | `frontend-design@claude-plugins-official` | Baseline taste: hierarchy, restraint, no AI-default look  |
| 2 — Code generation | `ui-ux-pro-max@ui-ux-pro-max-skill`       | Builds it: layout, interaction, a11y, component structure |
| 3 — Audit           | `impeccable@impeccable`                   | **Review only:** anti-patterns, contrast, AI-slop tells   |

Sources: [frontend-design](https://github.com/anthropics/claude-plugins-official) (Anthropic) ·
[ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT) ·
[impeccable](https://github.com/pbakaus/impeccable) (Apache 2.0)

Order of operations on any UI change: **1 sets the bar → 2 builds it → 3 audits the result →
`npm run lint` + `npm run typecheck` decide whether it ships.** Impeccable is deliberately
_not_ a generator here — see the rule in [CLAUDE.md](CLAUDE.md).

Four things to know:

- **Python 3.x must be on your PATH.** ui-ux-pro-max's search scripts (`scripts/search.py`) are
  Python, standard library only. This is a prerequisite for the plugin, **not** for RedyQuote —
  the app is Node 24 / npm only, and nothing in `src/` or the build touches Python.
- **The plugins do not overrule this repo's design system.** ui-ux-pro-max ships 161 color
  palettes and 57 font pairings, most of which `eslint.config.mjs` will reject on sight.
  [DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) and the semantic tokens in `src/app/globals.css`
  win every time — see the precedence rule in [CLAUDE.md](CLAUDE.md).
- **The impeccable baseline is clean, and contrast is its blind spot.** `npx impeccable detect src/`
  returns zero findings (verified 2026-08-05, v3.5.0) — `eslint.config.mjs` already bans the raw
  palette classes most of its detectors key on. But its contrast rules need two resolved colors,
  and our semantic tokens resolve at runtime, so a source scan **skips** the WCAG AA check rather
  than passing it. For real contrast coverage, audit the rendered page: `npm run dev`, then
  `npx impeccable detect http://localhost:3000/<route>` (needs `puppeteer`; install it globally,
  not as a project dependency).
- **A new finding is a real finding.** Because the baseline is empty, anything impeccable
  reports got past `npm run lint` and deserves a fix, not a suppression. If you do establish a
  finding contradicts [DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md), suppress it by rule id under
  `detector.ignoreRules` in `.impeccable/config.json` — never by changing a token.
- **Don't install the same tool twice.** All three come from the plugin system. If you
  previously installed them by hand (`uipro init`, `npx impeccable skills install`, or
  `claudekit`), delete the local copies so you aren't loading two versions of one skill.

`.claude/skills/` and `.impeccable/config.local.json` are gitignored: installed payloads and
per-developer overrides are machine state, not source. `.impeccable/config.json` **is**
committed — a suppression there is a team decision.

You can also run the auditor outside Claude Code:

```bash
npx impeccable detect src/          # exit 0 = clean, exit 2 = findings
npx impeccable detect --json src/   # machine-readable, for CI
```

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

## Open decisions blocking implementation

Two product decisions gate real work, and neither is a coding task:

- **Pricing formula and rounding rules** (PRD §2A) — until signed off, nothing may infer a
  calculation order or which fields are canonical. The quote builder's cost panel is
  deliberately inert as a result.
- **The fixed quote-line category list** (PRD-007A) — the `categories` table ships empty and
  the UI uses clearly-marked placeholders.

Tracked in [DATABASE.md](docs/DATABASE.md) §6.

---

> _Last updated:_ 2026-07-31 · _Owner:_ Viral Parikh
