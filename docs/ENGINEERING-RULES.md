# ENGINEERING-RULES.md — Coding Conventions, Banned Patterns, Testing

**Owner:** Viral Parikh
**Last updated:** 2026-08-13
**Source of truth for:** the engineering rules every change to the RedyQuote codebase must
follow, whoever or whatever writes it.

> Derived from: docs/ARCHITECTURE.md, docs/TECH-STACK.md
> Downstream: README.md, docs/PROJECT-STRUCTURE.md, docs/BACKLOG.md

---

## 1. Coding Conventions

- **Language:** TypeScript 5.x with `strict` enabled. New code MUST type-check under
  `tsc --noEmit`; `any` is a last resort with a stated reason.
- **Formatting & linting:** Prettier 3.x is the sole formatter and ESLint 9.x (flat config,
  `eslint.config.mjs`) the sole linter. Do not hand-format or add a competing tool. `next lint`
  was removed in Next 16 — lint via the ESLint Command-Line Interface (CLI).
- **Routing:** Next.js **App Router only**. The Pages Router MUST NOT be introduced.
- **Mutation path:** Server Actions are the sole path for authenticated writes. Server
  Components read; Server Actions write. A route handler under `src/app/api/` is permitted
  **only** for an external Hypertext Transfer Protocol (HTTP) surface that cannot be a Server
  Action — an inbound webhook or a third-party callback — never as an internal Application
  Programming Interface (API) layer for the app's own screens. There is no client-side
  server-state cache library: `revalidatePath` / `revalidateTag` is the invalidation mechanism.
- **Database access:** no Object-Relational Mapper (ORM). Reach Postgres through
  `@supabase/supabase-js` / PostgREST. Regenerate types with `npm run db:types` after any
  schema change and use the generated types; never hand-edit `src/lib/supabase/types.ts`.
- **Schema changes:** authored as Supabase CLI migrations under `supabase/migrations/*.sql` —
  tables, indexes, RLS policies, triggers, Remote Procedure Call (RPC) functions, and history
  tables included. Editing schema by hand in the Supabase dashboard is prohibited. Migrations
  are applied **after** merging to `main`, never before, and an applied migration is immutable:
  a new decision is a new file.
- **Validation:** Zod is the single schema-validation tool of record. All external input
  (Server Action arguments, form payloads, Uniform Resource Locator (URL) parameters) MUST be
  validated against a Zod schema server-side before it reaches the database.
  `src/lib/validation/settings.ts` is the shape to copy.
- **File structure:** follow [docs/PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md). Its §2 "Four
  Placement Questions" decides where a new file goes; do not invent a location.
- **Design tokens:** every color, font, radius, and type size comes from the semantic token
  layer in `src/app/globals.css`, per [docs/DESIGN-SYSTEM.md](DESIGN-SYSTEM.md). Never a hex
  literal, never a raw Tailwind palette class. This is enforced by `eslint.config.mjs`, not by
  convention.
- **Package manager:** `npm` only (bundled with Node.js 24 Long-Term Support (LTS)). Do not use
  `pnpm` or `yarn`.
- **Comments:** comment **why**, not **what** — explain a non-obvious decision, constraint, or
  trade-off; do not narrate code the reader can see.
- **Do not contradict the docs:** the source-of-truth documents in `docs/`, plus
  `CONTRIBUTING.md` and `CLAUDE.md`, are authoritative. A code comment or inline note that
  disagrees with one is a defect in the comment, not in the document. Changing a
  source-of-truth document has its own process — see `CONTRIBUTING.md`.

## 2. Banned Patterns

Each is banned because it breaks a decision in [ARCHITECTURE.md](ARCHITECTURE.md) or
[TECH-STACK.md](TECH-STACK.md):

- **Browser-to-Postgres direct Create/Read/Update/Delete (CRUD)** — every authenticated read and
  write goes through a Server Component or Server Action. The client holds no access authority.
- **A UI-only permission check standing in for a database one** — the `Review → Approved` and
  `Review → Draft` transitions are restricted to `role = 'admin'` inside Postgres by the
  `validate_quote_status_transition` trigger. A bypassed or scripted client MUST still be
  denied. Note the mechanism is a trigger, not an RLS policy: `WITH CHECK` cannot see the old
  row, so it cannot express a transition.
- **Client-side multi-step writes** — quote (header + line items) and product (fab tiers +
  defaults + price history) writes go through a single Postgres RPC transaction. Nothing may
  leave a row half-written.
- **Trusting a client-calculated number** — the quote builder recalculates live in the browser
  for UX only. The Server Action recomputes the canonical cost breakdown from stored data at
  save time; the client's numbers are never persisted as the trusted value.
- **Overwriting component cost history** — a cost change appends to `price_history`. Never an
  in-place update.
- **Introducing an ORM** (Prisma, Drizzle, TypeORM, etc.) — the stack is `supabase-js` +
  generated types by decision (TECH-STACK.md §4).
- **Ad-hoc / hand-rolled input validation** — Zod only.
- **Hand-rolled authentication or a custom credential store** — authentication is Supabase Auth
  (GoTrue); do not re-implement it.
- **Hex literals and raw Tailwind palette classes** (`bg-slate-100`, `text-black`, `bg-[#82424c]`)
  — they bypass the semantic token layer, do not flip in dark mode, and do not re-theme.
  `eslint.config.mjs` rejects them.
- **Reaching into app layers from `src/components/ui/`** — that directory is app-agnostic by
  construction and is the extraction boundary for a future shared library.
  `eslint.config.mjs` enforces it.
- **Pages Router, `next lint`, or `next build`-time linting** — all removed/disallowed under
  Next 16.
- **Building on `src/lib/mock/` or `src/components/prototype/`** — both are prototype-only and
  delete-on-wiring. The role switch in `prototype/` is an affordance toggle and is **not**
  authorization.
- **A `tenant_id` column or any per-tenant scaffolding** — RedyQuote is single-tenant by design
  (ARCHITECTURE.md §4).

## 3. Testing Rules

- **Frameworks:** Vitest 4.x for unit tests. Do not introduce a competing test runner. There is
  **no end-to-end framework** in the approved stack: no Playwright, no `e2e/`, no `test:e2e`.
  Adding one is a [docs/TECH-STACK.md](TECH-STACK.md) change first.
- **Placement:** unit tests are co-located as `*.test.ts` beside the module under test
  ([docs/PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md) §5). `vitest.config.ts` includes
  `src/**/*.test.ts` and nothing else.
- **Where tests run:** against pure functions and modules only. Development targets a hosted
  Supabase project with no local stack and no `db reset`
  ([docs/ENVIRONMENTS.md](ENVIRONMENTS.md) §1), so no test may write to the database.
- A valid test asserts observable behaviour against a Product Requirements Document (PRD)
  requirement or a Non-Functional Requirement (NFR), not implementation detail.
- **State-machine tests MUST cover rejected invalid transitions**, not only the happy path. The
  approval gate is the highest-value assertion in the repo.
- Do not mock away the security boundary (RLS, the transition trigger, authorization) to make a
  test pass — a test that green-lights a bypassed client is invalid.
- The blocking Continuous Integration (CI) gate is `lint` + `typecheck` + `format:check` +
  `test`. New feature work MUST land with unit tests in the gate. **There is no numeric
  line-coverage gate by decision** — coverage is judged by behaviour, not line count: a feature
  is adequately tested when its PRD-traced behaviour and its failure/rejection paths are
  asserted. A single happy-path test does not satisfy this.

### Known gap — the assertions nothing currently makes

The database-enforced approval gate is the one invariant a unit test cannot reach and a UI-only
test can pass while the real thing is broken. Nothing automated asserts today that a `rep`
session cannot move a quote out of `Review` when the request bypasses the UI. That gap is real
and is recorded in [docs/TECH-STACK.md](TECH-STACK.md) §5 alongside the decision not to carry an
End-to-End (E2E) framework for it.

**This is a gap register, not a test plan.** None of the six below is runnable under the
current stack: each needs a real Postgres session as a specific role, unit tests may not write
to the database (§3, "Where tests run"), and there is no E2E runner by decision. They are
written down because the alternative is worse — an invariant nobody has named is one nobody
notices losing. Moved here 2026-08-13 from `docs/DATABASE-SQL.md` §4.5 when that transient
spec was deleted; it was the only content in it with no migration to live in.

Each is concurrency or authorization behaviour that **reading the SQL will not confirm**:

1. **The approval gate.** A non-admin's direct `UPDATE quotes SET status = 'approved'` must be
   rejected **even when they own the row** (PRD-010, NFR-002). The single highest-value
   assertion in the repo: it is what distinguishes a database guarantee from a UI convention.
   Note `validate_quote_status_transition` is the _only_ layer enforcing it — there is no RLS
   backstop, by design — so nothing else catches this regression.
2. **A quote cannot be born approved.** A rep's direct
   `INSERT INTO quotes (..., status) VALUES (..., 'approved')` with `owner_id = self` must be
   rejected by `enforce_quote_created_in_draft`, as must an insert setting `approved_by`,
   `approved_at`, `sent_at`, or `submitted_at`. Pair it with an assertion that a normal
   `fn_save_quote` insert still succeeds, so a future tightening cannot break the save path
   unnoticed. This is the INSERT half of (1) — the trigger there is `BEFORE UPDATE` and covers
   nothing about creation. Losing either one leaves the gate covering a single statement type.
3. **Request-changes is admin-only too.** The `UPDATE` to `status = 'draft'` from
   `pending_approval` must be rejected for a non-admin owner. Easy to miss, because it is the
   one transition that moves a quote _backwards_ and the intuitive reading — "a rep can always
   pull their own quote back to Draft" — is the wrong one under PRD-010.
4. **A rejected quote can be resubmitted.** `pending_approval → draft → pending_approval` must
   succeed and leave `submitted_at` holding the _second_ submission's timestamp, not the first.
   This is the assertion that the `submitted_at := null` reset actually fires.
5. **The quote-number counter is race-free.** Two concurrent `fn_next_quote_number()` calls in
   the same calendar year must produce distinct numbers (PRD-011).
6. **`quote_number_sequences` is unreachable.** A plain `authenticated` caller's direct `select`
   or `update` must be denied, while `fn_save_quote` still allocates a number successfully.
   The pair proves the `SECURITY DEFINER` hop is doing the work and that the table's
   zero-policy state has not been "fixed" by someone chasing a permission-denied error.

Adopting a runner for these is a [docs/TECH-STACK.md](TECH-STACK.md) §5 decision first.
