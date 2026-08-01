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
- [docs/DATABASE.md](docs/DATABASE.md) — the data model: entities, ERD, every column and
  constraint, and why each table is shaped that way. Read it before touching anything that
  reads or writes a table. It is the **model**, not the DDL — the SQL that implements it is
  the spec listed below.

**Approved design specs** — same authority as the docs above, for the slice they cover, but
**transient**: each one is deleted when its content lands in whatever it feeds. A spec's
_path says nothing about its status_ — the two below sit in different folders for reasons
that have nothing to do with how authoritative they are (see PROJECT-STRUCTURE.md §5, "Docs").

- [docs/superpowers/specs/2026-07-23-authorization-matrix-design.md](docs/superpowers/specs/2026-07-23-authorization-matrix-design.md)
  — the complete two-role (`rep` / `admin`) authorization model. **Amends** PRD-010 and
  ARCHITECTURE §2/§7, and resolves PRD §2A, PRD-012, PRD-013. Read it before writing any RLS
  policy, Server Action guard, or permission check — the base PRD/ARCHITECTURE text it amends
  is superseded, not authoritative. Lives under the tool-owned path because the `superpowers`
  plugin wrote it there and would recreate the folder if moved.
- [docs/superpowers/specs/2026-08-01-branding-assets-upload-design.md](docs/superpowers/specs/2026-08-01-branding-assets-upload-design.md)
  — future design for settings-branding logo/favicon upload and replacement using deployment-safe
  asset storage without immediate `settings` schema changes. Design-only in this phase; no code
  wiring and no DB migration are part of that spec.
- [docs/DATABASE-SQL.md](docs/DATABASE-SQL.md) — the full DDL for
  [docs/DATABASE.md](docs/DATABASE.md)'s model: tables, enums, triggers, the atomic RPC
  functions, and every RLS policy. **Feeds `supabase/migrations/*.sql`; delete it once those
  migrations are authored**, because ARCHITECTURE §5 makes the migrations the authoritative
  schema and two copies of the same SQL would drift. Carries two go-live blockers in its §4 —
  a `profiles` role self-escalation hole, and the rule not to wire the save RPC before
  PRD §2A is signed off. Hand-authored, so it sits beside the model doc it implements rather
  than in the plugin's folder.

When a new spec lands, add it to this list in the same change, wherever it lives. A spec's
content moves into what it feeds once fully incorporated (see docs/DESIGN-SYSTEM.md's
provenance note in §1 for the precedent) — remove it from this list in that same change.

**Everything else in `docs/*.md` is permanent.** The specs above are the only exceptions, and
each says so in its own header. Don't add a transient file to `docs/` without listing it here.

**Before creating any new route, Server Action, component, `src/lib/` module, or migration,
consult [docs/PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md) for where it goes** — its §2
"Four Placement Questions" decides the location, and §4 encodes the placement rules that keep
the ARCHITECTURE invariants intact. If reality has to diverge from that layout, update that
file in the same change (see its §6).

This file is the single home for Claude Code's working rules on RedyQuote. Keep AI-behavior rules
here and product/architecture facts in `docs/`.

## Project state

**Last verified: 2026-08-01.** Confirm a file or script still exists before relying on this
section — it is a snapshot, and a stale one is worse than none.

**Built.** The `@/*` alias resolves to `./src/*`.

- **UI, end to end but unwired.** All routes under `src/app/(app)/` (quotes list, quote
  builder, products, component library, settings) plus `src/app/(auth)/login/`, the app shell,
  and 15 primitives in `src/components/ui/`. Every screen reads from **`src/lib/mock/`**, not
  from Supabase.
- **Token layer** — `src/app/globals.css`, enforced by `eslint.config.mjs`.
- **Supabase plumbing** — `src/lib/supabase/` (browser + server clients, session refresh),
  `src/proxy.ts`, `.env.example`, `supabase/config.toml`, and a linked hosted project.
- **Migrations `0001`–`0004`, all applied to the linked project** — extensions and enums;
  `profiles` + auth + `is_admin()` + the role-escalation guard; `settings` +
  `settings_history` + seed row; and `0004`, which renames the two markup columns from
  `*_multiplier` to `*_percent`. Each table ships with its own RLS, verified enabled on the
  remote. `src/lib/supabase/types.ts` is generated against this schema and is current.
  `0005` onward (categories, products, quotes, RPCs) is untranscribed — see
  [docs/DATABASE-SQL.md](docs/DATABASE-SQL.md)'s "Transcription status".
  - **The hosted schema is real now. Treat every migration file as immutable** — `db push`
    compares recorded versions, not file contents, so editing an applied file is skipped
    silently while reading as though it landed. `0004` exists because that happened once.
  - **`npm run db:types` is broken**: it calls a bare `supabase` that is not on PATH, and its
    `>` redirect truncates `types.ts` to empty _before_ failing, leaving the repo in a state
    where `typecheck` fails with three TS2306 errors. Until the script is fixed, run
    `npx supabase gen types typescript --linked > src/lib/supabase/types.ts` and then
    `npx prettier --write src/lib/supabase/types.ts` — generator output is not Prettier-clean
    and `format:check` fails without it.
- **Tooling** — Prettier, Husky + lint-staged, ESLint with the `ui/` boundary and
  semantic-token rules.

**Not built.** No `src/server/actions/`, no `src/lib/pricing/`, no `src/lib/validation/`,
no `e2e/`, no `vitest.config.ts`, no CI workflow. **Nothing in the app talks to the database
yet**, and no Server Action exists — so any feature work starts by creating that path, not by
extending one. An applied schema does not change this: `profiles`, `settings`, and
`settings_history` exist on the remote and hold nothing but the seeded `settings` row —
zero users, zero history. Every screen still reads `src/lib/mock/`.

**Two prototype-only directories, both delete-on-wiring** — `src/lib/mock/` (fixtures) and
`src/components/prototype/` (a client-side role switch that is _not_ authorization). Don't
build on either; replace them.

**Two open product decisions block real work** — the pricing formula (PRD §2A) and the
fixed-category list (PRD-007A). See docs/DATABASE.md §6.

## Approved stack (TECH-STACK.md — do not deviate)

- **Next.js 16** (App Router) · **React 19** · **TypeScript 5** · **Node.js 24 LTS** (Active
  LTS; `.nvmrc` + `engines.node`)
- **Supabase** — Postgres 17 + Auth. Single-tenant, single runtime role.
- **npm only** — do not use pnpm or yarn.
- **Cut for v1:** Resend, Sentry, PostHog, `pgmq`, `pg_cron`, Edge Functions. Do not
  introduce a tool that isn't in TECH-STACK.md.

## Non-negotiable invariants (ARCHITECTURE.md)

These are structural guarantees, not conventions — don't write code that breaks them:

- **Database-enforced approval gate** — both exits from `Pending Approval` (→ `Approved`
  and → `Draft`) are restricted to `role = 'admin'` inside Postgres, never by a UI-only
  check. The mechanism is the `validate_quote_status_transition` trigger, **not** an RLS
  policy: `WITH CHECK` cannot see the old row, so it cannot express a transition. Don't
  weaken the trigger on the assumption RLS is a second layer here — it isn't
  (docs/DATABASE-SQL.md §3).
- **Atomic multi-row save** — quote (header + line items) and product (fab tiers + defaults
  - price history) writes go through a single Postgres RPC transaction. No client-side
    multi-step writes that can leave a row half-written.
- **Server-side pricing trust boundary** — the Server Action recomputes the canonical cost
  breakdown from stored data at save time. Client-calculated numbers are for UX only and
  are never persisted as the trusted value.
- **Quote lifecycle** — Draft → Pending Approval → Approved → Sent, **plus
  Pending Approval → Draft** (request changes, PRD-010), and nothing else. Both transitions
  out of Pending Approval are admin-only. Every status change writes an audit row.
- **Append, never overwrite** — component cost changes append to `price_history`.

## Claude Code-specific config

- **Commands** (verified 2026-08-01 — `package.json` is the authority; don't invent scripts):
  - Run clean: `npm run dev`, `build`, `lint`, `typecheck`, `format`, `format:check`, `start`.
  - `npm run test` exits 0 but proves nothing — it is `vitest run --passWithNoTests` and there
    are no tests. Treat a green `test` as "not run", not "passed" (docs/TODO.md §A.2).
  - `npm run db:push` / `db:types` exist and the project is linked. `db:push` now has three
    pending migrations to apply; `db:types` still regenerates types for an **empty** schema
    until that push happens.
  - **`test:e2e` does not exist.** No Playwright config, no `e2e/` (docs/TODO.md §C.2).
- **Applying migrations: use `/db-migrate`, not a bare `db:push`.** The slash command
  ([.claude/commands/db-migrate.md](.claude/commands/db-migrate.md)) is the approved path —
  pre-flight, dry run, push, `db:types`, then verification that RLS is actually enabled on
  every new table. `/db-migrate dry-run` stops after the dry run.
  - Reason it exists: dev runs against a hosted project with **no local stack and no `db reset`**
    (docs/ENVIRONMENTS.md §1), so a bad migration lands on a real database with no automated
    backups on the Free tier (PRD NFR-006a). The pre-flight is the whole value; a bare
    `db push` skips it.
  - **Never push without the user seeing the migration first**, and never re-apply or edit an
    already-applied migration file — a new change is a new file.
  - There is deliberately **no `npm run db:migrate`** wrapper: a one-liner that pushes
    unreviewed SQL is the thing this command exists to prevent.
- **No local Supabase stack.** Development runs against a hosted project; Docker is not
  installed. Never suggest `supabase start` or `db reset` as a current step — see
  [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md) §4 for the deferred adoption plan.
- **Secrets:** never read, print, or write `.env`, `.env*.local`, or any file holding the
  Supabase service-role key or other credentials.
- **Editing source-of-truth docs:** changes to anything in `docs/` are deliberate decisions,
  not incidental edits during feature work — call them out and get approval, don't fold them
  into an unrelated change.
