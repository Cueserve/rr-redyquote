# RedyQuote

> A quoting system REDYREF's sales team can trust — with consistent pricing, enforced approvals, and no silent quote loss, corruption, or duplication.

[![Next.js](https://img.shields.io/badge/Next.js-16.x-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.x-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22_LTS-339933.svg)](https://nodejs.org/)
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
- **RLS-enforced approval gate** — the one non-flat rule in the app. The
  `Pending Approval → Approved` transition is restricted to `role = 'admin'` by a Postgres
  RLS policy, not a hidden UI button, so a bypassed or scripted client is still denied.
- **Atomic multi-row save** — saving a quote (header + line items) or a product (fab tiers +
  defaults + price history) goes through a single Postgres RPC transaction, so a failure
  partway through never leaves a row half-written.
- **Server-side pricing trust boundary** — the quote builder recalculates live in the
  browser for UX, but the Server Action recomputes the canonical cost breakdown from stored
  data at save time; the client's numbers are never trusted as the value that gets
  persisted.

## Prerequisites

> **Pending scaffold — unverified.** The app is not scaffolded in this repository yet — no
> `package.json`, `.env.example`, or `supabase/` directory exists on `main`. The versions
> below are the approved stack from [TECH-STACK.md](docs/TECH-STACK.md). The exact list
> will be confirmed and tested once we scaffold the app.

- Node.js 22 LTS or higher
- npm (bundled with Node.js 22 LTS) — the only approved package manager; do not use pnpm
  or yarn
- Supabase CLI (latest) — for the local dev stack and migrations
- Git
- A Supabase account and project (Postgres 17) — no `pgmq`, `pg_cron`, or Edge Functions
  needed; RedyQuote has no unauthenticated capture pipeline to isolate
- A Vercel account (hosts the Next.js app)

No optional accounts. Resend, Sentry, and PostHog are all deliberately cut for v1
(TECH-STACK.md §5) — there's no email/PDF delivery, and no error-tracking or
product-analytics need for a single internal tool.

## Install & Run

> **Pending scaffold — unverified.** These commands assume the standard Next.js 16 + npm
> and Supabase CLI setup from [TECH-STACK.md](docs/TECH-STACK.md). They have **not** been
> run yet, and will be tested and corrected when we scaffold the app.

```bash
npm install
supabase start        # local Supabase stack (Postgres, Auth)
supabase db push      # apply migrations from supabase/migrations/
npm run dev           # start the Next.js app locally
```

## Project Structure

> The app directories (`app/`, `supabase/`) are the intended layout from
> [ARCHITECTURE.md](docs/ARCHITECTURE.md). They are created when we scaffold the app. Only
> `docs/` exists today.

```text
app/         Next.js App Router application — Server Components (reads), Server Actions (writes)
supabase/    Supabase CLI migrations (migrations/*.sql) — schema, RLS policies, RPC functions
docs/        Source-of-truth documents (PRODUCT, PRD, ARCHITECTURE, TECH-STACK)
```

## Further Reading

- [PRD.md](docs/PRD.md) — requirements and feature scope
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — system structure and design decisions
- [TECH-STACK.md](docs/TECH-STACK.md) — approved technologies and usage rules

---

> _Last updated:_ 2026-07-23 · _Owner:_ Viral Parikh
