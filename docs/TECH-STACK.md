# TECH-STACK.md — Approved Technologies

**Owner:** Viral Parikh
**Last updated:** 2026-07-23
**Source of truth for:** the technologies approved for RedyQuote v1 and the rules for how
each may be used.

> Derived from: docs/PRD.md, docs/ARCHITECTURE.md
> Downstream: README.md

---

## 1. Languages & Frameworks

| Technology           | Version            | Reason                                                                                                                                                                                  |
| -------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript           | 5.x (strict)       | One typed language across Server Components, Server Actions, and the shared pricing-calc module.                                                                                        |
| Next.js (App Router) | 16.x               | Server Components for reads, Server Actions as the sole mutation path (ARCHITECTURE §1). No separate JSON API layer — RedyQuote doesn't need the SPA/REST split a bigger product would. |
| React                | 19.x               | Renders Server Components and the one client component (quote builder live recalc).                                                                                                     |
| Node.js              | 24 LTS ("Krypton") | Runtime for the Next.js server on Vercel. The Active LTS line — v22 went to Maintenance on 2025-10-21.                                                                                  |

## 2. Datastores

| Datastore         | Version | Role                                                                                                                         |
| ----------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Supabase Postgres | 17      | Sole datastore: products, components, quotes, settings, price/status history. Single schema, no `tenant_id` (single-tenant). |
| Supabase Storage  | managed | Stores the branding favicon image.                                                                                           |

No `pgmq`, `pg_cron`, or Supabase Edge Functions — those exist elsewhere to isolate an
unauthenticated capture pipeline, which RedyQuote has no equivalent of (ARCHITECTURE §6:
no external integrations in v1).

## 3. Cloud & Infrastructure Services

| Service                | Purpose                               | Notes                                                                                |
| ---------------------- | ------------------------------------- | ------------------------------------------------------------------------------------ |
| Vercel                 | Hosts the Next.js app                 | Region co-located with the Supabase project                                          |
| Supabase Platform      | Managed Postgres, Auth, Storage       | **Free** tier for now; Pro at production cutover. No PITR (NFR-006)                  |
| Supabase Auth (GoTrue) | Credential store and session issuance | bcrypt-hashed passwords; session cookie via `@supabase/ssr`                          |
| GitHub Actions         | CI on every PR to `main`              | Blocking job: lint + type-check + Vitest unit. Advisory/nightly job: Playwright E2E. |

## 4. Key Libraries / Tools

| Library / tool                  | Version                  | Used for                                                                                                                               |
| ------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Tailwind CSS                    | 4.x                      | Utility styling                                                                                                                        |
| shadcn/ui                       | CLI-pinned (Radix-based) | Accessible component primitives                                                                                                        |
| Zod                             | 3.x                      | Server Action input validation — single tool of record, no hand-rolled validation                                                      |
| `@supabase/supabase-js`         | 2.x                      | Postgres/Storage access, session-bound so RLS applies                                                                                  |
| `@supabase/ssr`                 | 0.x                      | Supabase Auth session handling via httpOnly cookies in Server Components/Actions                                                       |
| Supabase CLI                    | latest                   | Database migrations (`supabase/migrations/*.sql`); schema and RLS policies are versioned as SQL, never edited by hand in the dashboard |
| `supabase gen types typescript` | (Supabase CLI)           | Generates TypeScript types from the schema; regenerated after each migration. No ORM.                                                  |
| Vitest                          | 3.x                      | Unit tests — the shared pricing-calc function is a pure function and gets exhaustive coverage here                                     |
| Playwright                      | 1.x                      | E2E — quote builder flow, submit/approve gate                                                                                          |
| ESLint                          | 9.x                      | Linting (flat config, `eslint.config.mjs`)                                                                                             |
| Prettier                        | 3.x                      | Formatting                                                                                                                             |
| Husky                           | 9.x                      | Git hooks (pre-commit)                                                                                                                 |
| lint-staged                     | 16.x                     | Runs Prettier/ESLint on staged files at commit time                                                                                    |

## 5. Deliberately Not Used

| Not used                                   | Why not                                                                                                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TanStack Query                             | Needed for an SPA/JSON-API split; with Server Actions + `revalidatePath`, cache invalidation is handled by the framework                                              |
| Sentry                                     | Confirmed cut for v1 — revisit if production error visibility becomes a real problem                                                                                  |
| PostHog                                    | No onboarding funnel or product-analytics need for a single internal tool                                                                                             |
| Resend, `@react-pdf/renderer`              | No email or PDF delivery in v1 scope (PRODUCT.md §4). Adding either later slots in behind the existing Server Action pattern without touching the access/audit model. |
| `pgmq`, `pg_cron`, Supabase Edge Functions | No unauthenticated capture pipeline exists in RedyQuote's scope                                                                                                       |

## 6. Versions & Constraints

- Node.js MUST be on the **Active LTS** line — currently **24.x** (Vercel runtime). Pinned in
  `.nvmrc` and enforced by `engines.node` in `package.json`. The policy is "track Active LTS,"
  which means one deliberate review per October promotion: v24 enters Maintenance
  **2026-10-20** and v26 becomes LTS **2026-10-28**, so revisit this line then rather than
  drifting onto a Current (odd-numbered, non-LTS) release by accident.
- Next.js 16.x App Router only.
- React 19.x; TypeScript 5.x with `strict` enabled.
- Supabase Postgres 17.
- **Supabase plan is Free for now.** PITR is NOT required for v1 (NFR-006c) — it is a $100/mo
  add-on and is out of budget for an internal tool at this scale. Before production cutover
  (first real customer quote stored), the project MUST move to **Pro** ($25/mo) for its
  included daily backups (NFR-006b). Free has **no automated backups at all**, so while on
  Free: run `supabase db dump` before any destructive migration.
- TLS 1.2+ enforced at both the Vercel and Supabase edges; plaintext HTTP rejected
  (NFR-004).
- No service-role key is used anywhere in this application (ARCHITECTURE §1) — there is
  nothing to confine, since no unauthenticated system path exists. If one is ever
  introduced, it MUST be server-side only, MUST NOT carry the `NEXT_PUBLIC_` prefix, and
  this file MUST be updated first.
- Secrets (Supabase URL/anon key, any future server-only secret) live in Vercel
  Environment Variables and MUST NOT be committed to the repository. Only the Supabase URL
  and anon key may be public.
- All schema changes — tables, indexes, RLS policies, the quote-number sequence, RPC
  functions — MUST be authored as Supabase CLI migrations in `supabase/migrations/` and
  applied via `supabase db push`. Hand-editing schema or RLS in the Supabase dashboard is
  prohibited.
- Zod is the single schema-validation tool of record for Server Action inputs.
- The package manager is `npm` (bundled with the approved Node.js 24 LTS).
- ESLint 9.x + Prettier 3.x are the only linter/formatter; Husky + lint-staged enforce
  format/lint at commit time.
- Exact patch versions are pinned in the lockfile at scaffold time; this file records the
  approved major/minor line.
