# PROJECT-STRUCTURE.md — Directory Layout & File Placement

**Owner:** Viral Parikh
**Last updated:** 2026-07-23
**Source of truth for:** where each kind of file lives and the rules for placing new code —
so features and components land in the right place and don't break the invariants in
docs/ARCHITECTURE.md.

> Derived from: docs/ARCHITECTURE.md, docs/TECH-STACK.md
> Downstream: README.md, CLAUDE.md

---

> **Intended, not verified.** The repository currently holds only `docs/` plus a **default
> `create-next-app` scaffold** (`app/page.tsx`, `app/layout.tsx`, `app/globals.css`,
> boilerplate `public/*.svg`) — none of the structure below is built yet. This file is the
> **target layout** derived from docs/ARCHITECTURE.md and docs/TECH-STACK.md. Confirm a
> directory exists before assuming it does; when you create one, follow this layout, and if
> reality must diverge, update this file in the same change (see [§5](#5-keeping-this-file-honest)).

---

## Contents

1. [Directory Tree](#1-directory-tree)
2. [What Lives Where](#2-what-lives-where)
3. [File Placement Rules](#3-file-placement-rules)
4. [Naming Conventions](#4-naming-conventions)
5. [Keeping This File Honest](#5-keeping-this-file-honest)

---

## 1. Directory Tree

```text
redyquote/
├─ app/                         # Next.js 16 App Router — the whole runtime surface
│  ├─ (auth)/
│  │  └─ login/page.tsx         # sign-in (Supabase Auth); the only pre-session route
│  ├─ (app)/                    # authenticated shell — every route here assumes a session
│  │  ├─ layout.tsx             # app chrome; reads session server-side
│  │  ├─ quotes/
│  │  │  ├─ page.tsx            # quote list        (Server Component — read)
│  │  │  ├─ new/page.tsx        # new quote
│  │  │  └─ [id]/page.tsx       # quote detail / builder host
│  │  ├─ products/              # product catalog + fab tiers   (admin-managed)
│  │  ├─ library/               # component library             (admin-managed)
│  │  └─ settings/              # rates, markups, branding      (admin-only)
│  ├─ actions/                  # Server Actions — the SOLE mutation path (ARCH §1, §5)
│  │  ├─ quotes.ts              # save / submit / approve / mark-sent
│  │  ├─ products.ts            # save product (+ fab tiers, defaults, price history)
│  │  ├─ components.ts          # save component
│  │  └─ settings.ts            # save settings, upload favicon
│  ├─ layout.tsx                # root layout
│  ├─ page.tsx                  # entry (redirect to /quotes or /login)
│  └─ globals.css
├─ components/                  # React components not tied to one route
│  ├─ ui/                       # shadcn/ui primitives (Radix-based)
│  └─ quote-builder/            # the ONE rich client component — live recalc (ARCH §1)
├─ lib/                         # framework-agnostic logic; no JSX
│  ├─ pricing/                  # shared cost/margin calc — imported by client AND server
│  ├─ validation/               # Zod schemas for Server Action inputs (single tool, ARCH §5)
│  └─ supabase/
│     ├─ server.ts              # session-bound server client (@supabase/ssr) — RLS applies
│     ├─ client.ts              # browser client
│     ├─ middleware.ts          # session refresh for Server Actions/Components
│     └─ types.ts               # generated DB types (`supabase gen types`) — no ORM
├─ supabase/
│  ├─ migrations/               # *.sql — tables, RLS policies, quote-number sequence, RPCs
│  └─ config.toml               # local stack config
├─ e2e/                         # Playwright — quote flow, submit/approve gate
├─ docs/                        # source-of-truth docs (this file lives here)
├─ public/                      # static assets
├─ middleware.ts                # Next.js middleware — Supabase session refresh
├─ package.json  tsconfig.json  next.config.ts
├─ eslint.config.mjs  postcss.config.mjs
└─ CLAUDE.md  README.md
```

Unit tests (Vitest) are **co-located** as `*.test.ts` next to the module under test — the
`lib/pricing/` calc function especially gets exhaustive coverage there. Playwright E2E specs
live in `e2e/`, separate from unit tests.

## 2. What Lives Where

| Concern | Location | Why |
| --- | --- | --- |
| Page/route reads | `app/(app)/**/page.tsx` (Server Components) | Read path; session-bound Supabase reads so RLS applies (ARCH §1) |
| Writes of any kind | `app/actions/*.ts` (Server Actions) | Sole mutation path — no direct browser→Postgres writes (ARCH §5) |
| Shared pricing calc | `lib/pricing/` | One canonical formula imported by both the client preview and the server recompute (ARCH §1, §5) |
| Input validation | `lib/validation/` (Zod) | Single validation tool of record (ARCH §5, TECH-STACK §4) |
| Supabase access | `lib/supabase/` | Session-bound clients via `@supabase/ssr`; no service-role key anywhere (ARCH §1) |
| Generated DB types | `lib/supabase/types.ts` | `supabase gen types typescript`; regenerated after each migration — no ORM (TECH-STACK §4) |
| Schema / RLS / RPC / sequence | `supabase/migrations/*.sql` | Authoritative schema; never hand-edited in the dashboard (ARCH §5, TECH-STACK §6) |
| Reusable UI | `components/` (`ui/` for shadcn) | Not route-specific |
| The live quote builder | `components/quote-builder/` | The only rich client component in the app (ARCH §1) |

## 3. File Placement Rules

Read these before creating any new feature, route, action, or component.

1. **A mutation goes in `app/actions/`, never in a component or route handler.** Server
   Actions are the sole write path (ARCH §5). If a new feature writes data, it adds/extends
   an action file here — not a client-side write, not a separate API route.
2. **Any code that computes a cost or margin imports from `lib/pricing/`.** Never inline a
   pricing formula in a component or an action. Client preview and server recompute must use
   the *same* module so they agree; the server value is the trusted one (ARCH §1, §5).
3. **Every Server Action validates its input with a Zod schema from `lib/validation/`.** No
   hand-rolled validation (ARCH §5).
4. **Multi-row writes go through a Postgres RPC in `supabase/migrations/`, called from one
   action.** Quote (header + lines) and product (tiers + defaults + price history) saves are
   atomic RPC transactions — never sequential client-driven writes (ARCH §3, §5).
5. **Schema, RLS, the quote-number sequence, and RPC functions are SQL migration files
   only.** Add a new `supabase/migrations/*.sql`; regenerate `lib/supabase/types.ts` after.
   Never edit schema or RLS in the Supabase dashboard (ARCH §5, TECH-STACK §6).
6. **Default to a Server Component.** Add `"use client"` only where genuine interactivity
   needs it — realistically just `components/quote-builder/`. A new client component is a
   decision to justify, not a default (ARCH §1).
7. **Data access is session-bound.** Import the Supabase client from `lib/supabase/` — never
   construct a client with a service-role key; none exists in this app (ARCH §1).
8. **Do not add a datastore, API layer, email/PDF, or analytics tool.** The stack is fixed
   in docs/TECH-STACK.md §5; anything not listed there is out of scope until that file changes.
9. **No `tenant_id` or per-tenant scaffolding.** Single-tenant by design (ARCH §4).

## 4. Naming Conventions

- **Routes** — kebab-case folder segments under `app/`; `page.tsx` for the view,
  `layout.tsx` for shared chrome. Route groups `(auth)` / `(app)` separate the pre-session
  and authenticated surfaces without affecting the URL.
- **Action files** — one file per aggregate in `app/actions/` (`quotes.ts`, `products.ts`,
  …), named after the domain object they mutate.
- **Migrations** — Supabase CLI default `NNNN_snake_case_description.sql`; ordering is by the
  numeric prefix. One logical change per migration.
- **`lib/` modules** — no JSX, no React imports; pure TypeScript so they're unit-testable and
  reusable across client and server. The `library/` *route* (component library UI) is a
  distinct thing from `lib/` — don't conflate them.
- **Tests** — `*.test.ts` co-located for Vitest units; `*.spec.ts` under `e2e/` for Playwright.

## 5. Keeping This File Honest

This layout is intended, not yet built. When you create real directories:

- If they match this file, no change needed.
- If reality must diverge (a rename, a split, a new top-level dir), **update this file in the
  same change** and note why — a stale structure doc is worse than none.
- Editing this file is a deliberate decision, like any `docs/` change (CLAUDE.md): call it
  out, don't fold a structural change silently into unrelated feature work.
