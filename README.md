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
- **`npm run db:push` has nothing to apply.** The script and the linked project both exist,
  but `supabase/migrations/` does not — the schema is still a spec (see Further Reading).
  `npm run db:types` would likewise regenerate types for an empty database.

Fonts are Archivo (all text) and IBM Plex Mono (tabular numerics only), self-hosted via
[`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) — no
external request, no layout shift. See [DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) §8.

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
  [spec](docs/DATABASE-SQL.md) awaiting
  authoring as migrations.
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
