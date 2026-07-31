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
- [docs/PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md) — directory layout and file-placement rules
- [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md) — which Supabase environment dev runs against, and why
- [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) — brand tokens, the semantic-token rule, and the
  WCAG AA floor. Read it before adding a color, a font, or a `ui/` component.

**Approved design specs** — same authority as the docs above, for the slice they cover. They
live under `docs/superpowers/specs/` because the `superpowers` plugin writes them there; the
tool-named path says nothing about their status (see PROJECT-STRUCTURE.md §5, "Docs").

- [docs/superpowers/specs/2026-07-23-authorization-matrix-design.md](docs/superpowers/specs/2026-07-23-authorization-matrix-design.md)
  — the complete two-role (`rep` / `admin`) authorization model. **Amends** PRD-010 and
  ARCHITECTURE §2/§7, and resolves PRD §2A, PRD-012, PRD-013. Read it before writing any RLS
  policy, Server Action guard, or permission check — the base PRD/ARCHITECTURE text it amends
  is superseded, not authoritative.

When a new spec lands there, add it to this list in the same change. A spec's content moves
into the doc it amends once fully incorporated (see docs/DESIGN-SYSTEM.md's provenance note in
§1 for the precedent) — remove it from this list in that same change.

**Before creating any new route, Server Action, component, `src/lib/` module, or migration,
consult [docs/PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md) for where it goes** — its §2
"Four Placement Questions" decides the location, and §4 encodes the placement rules that keep
the ARCHITECTURE invariants intact. If reality has to diverge from that layout, update that
file in the same change (see its §6).

This file is the single home for Claude Code's working rules on RedyQuote. Keep AI-behavior rules
here and product/architecture facts in `docs/`.

## Project state

A **default `create-next-app` scaffold** exists, moved under `src/`: root `package.json`,
`tsconfig.json`, `next.config.ts`, `node_modules/`, and boilerplate `src/app/`
(`page.tsx`, `layout.tsx`, `globals.css`, `favicon.ico`) plus `public/*.svg`. The `@/*` path
alias resolves to `./src/*`. **None of the intended architecture is built yet** — no
`src/server/actions/`, `src/lib/`, `src/components/`, `src/proxy.ts`, `supabase/` migrations,
`e2e/`, or `.env.example`. Treat the layout in
[docs/PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md) and the commands/versions in the
docs/README as _intended_, not verified. Confirm a script or file exists before assuming it
does.

## Approved stack (TECH-STACK.md — do not deviate)

- **Next.js 16** (App Router) · **React 19** · **TypeScript 5** · **Node.js 24 LTS** (Active
  LTS; `.nvmrc` + `engines.node`)
- **Supabase** — Postgres 17 + Auth. Single-tenant, single runtime role.
- **npm only** — do not use pnpm or yarn.
- **Cut for v1:** Resend, Sentry, PostHog, `pgmq`, `pg_cron`, Edge Functions. Do not
  introduce a tool that isn't in TECH-STACK.md.

## Non-negotiable invariants (ARCHITECTURE.md)

These are structural guarantees, not conventions — don't write code that breaks them:

- **RLS-enforced approval gate** — `Pending Approval → Approved` is restricted to
  `role = 'admin'` by a Postgres RLS policy, never a UI-only check.
- **Atomic multi-row save** — quote (header + line items) and product (fab tiers + defaults
  - price history) writes go through a single Postgres RPC transaction. No client-side
    multi-step writes that can leave a row half-written.
- **Server-side pricing trust boundary** — the Server Action recomputes the canonical cost
  breakdown from stored data at save time. Client-calculated numbers are for UX only and
  are never persisted as the trusted value.
- **Quote lifecycle** — Draft → Pending Approval → Approved → Sent, and nothing else. Every
  status change writes an audit row.
- **Append, never overwrite** — component cost changes append to `price_history`.

## Claude Code-specific config

- **Commands:** `npm install`, `npm run dev`, `npm run build`, and `npm run lint` are verified
  to work. Anything else (`db push`, `db:types`, `test`, `test:e2e`) does not exist yet — don't
  invent scripts; confirm they exist first.
- **No local Supabase stack.** Development runs against a hosted project; Docker is not
  installed. Never suggest `supabase start` or `db reset` as a current step — see
  [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md) §4 for the deferred adoption plan.
- **Secrets:** never read, print, or write `.env`, `.env*.local`, or any file holding the
  Supabase service-role key or other credentials.
- **Editing source-of-truth docs:** changes to anything in `docs/` are deliberate decisions,
  not incidental edits during feature work — call them out and get approval, don't fold them
  into an unrelated change.
