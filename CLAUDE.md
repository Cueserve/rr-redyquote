# CLAUDE.md — Claude Code adapter for RedyQuote

Claude Code reads this file automatically from the repo root.

## Source-of-truth docs

RedyQuote's product, requirements, architecture, and stack decisions live in `docs/`.
**Read the relevant one before proposing a change; never derive architecture or stack
decisions from memory.**

- [docs/PRODUCT.md](docs/PRODUCT.md) — problem statement, scope, success criteria
- [docs/PRD.md](docs/PRD.md) — requirements and feature scope
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system structure and design decisions
- [docs/TECH-STACK.md](docs/TECH-STACK.md) — approved technologies and usage rules

This file is the single home for Claude Code's working rules on RedyQuote. Keep AI-behavior rules
here and product/architecture facts in `docs/`.

## Project state

The app is **not scaffolded** on `main` — no `package.json`, `.env.example`, or `supabase/`
directory exists yet. Only `docs/` and `README.md` are present. Treat the directory layout,
commands, and versions in the docs/README as *intended*, not verified. Confirm before
assuming any script or file exists.

## Approved stack (TECH-STACK.md — do not deviate)

- **Next.js 16** (App Router) · **React 19** · **TypeScript 5** · **Node.js 22 LTS**
- **Supabase** — Postgres 17 + Auth. Single-tenant, single runtime role.
- **npm only** — do not use pnpm or yarn.
- **Cut for v1:** Resend, Sentry, PostHog, `pgmq`, `pg_cron`, Edge Functions. Do not
  introduce a tool that isn't in TECH-STACK.md.

## Non-negotiable invariants (ARCHITECTURE.md)

These are structural guarantees, not conventions — don't write code that breaks them:

- **RLS-enforced approval gate** — `Pending Approval → Approved` is restricted to
  `role = 'admin'` by a Postgres RLS policy, never a UI-only check.
- **Atomic multi-row save** — quote (header + line items) and product (fab tiers + defaults
  + price history) writes go through a single Postgres RPC transaction. No client-side
  multi-step writes that can leave a row half-written.
- **Server-side pricing trust boundary** — the Server Action recomputes the canonical cost
  breakdown from stored data at save time. Client-calculated numbers are for UX only and
  are never persisted as the trusted value.
- **Quote lifecycle** — Draft → Pending Approval → Approved → Sent, and nothing else. Every
  status change writes an audit row.
- **Append, never overwrite** — component cost changes append to `price_history`.

## Claude Code-specific config

- **Commands:** the README's `npm install` / `supabase start` / `db push` / `npm run dev`
  are unverified until the app is scaffolded. Don't invent scripts; confirm they exist first.
- **Secrets:** never read, print, or write `.env`, `.env*.local`, or any file holding the
  Supabase service-role key or other credentials.
- **Editing source-of-truth docs:** changes to anything in `docs/` are deliberate decisions,
  not incidental edits during feature work — call them out and get approval, don't fold them
  into an unrelated change.
