# PROJECT-STRUCTURE.md — Directory Layout & File Placement

**Owner:** Viral Parikh
**Last updated:** 2026-07-26
**Source of truth for:** where each kind of file lives and the rules for placing new code —
so features and components land in the right place and don't break the invariants in
docs/ARCHITECTURE.md.

> Derived from: docs/ARCHITECTURE.md, docs/TECH-STACK.md
> Downstream: README.md, CLAUDE.md

---

> **Partly built.** What exists today: `docs/`, `src/app/` (still the default
> `create-next-app` boilerplate — `page.tsx`, `layout.tsx`, `globals.css`, `favicon.ico`),
> `public/*.svg`, and root config. Everything else below — `src/components/`, `src/lib/`,
> `src/server/`, `src/proxy.ts`, `supabase/`, `e2e/` — is the **target layout** and does not
> exist yet. Confirm a directory exists before assuming it does; when you create one, follow
> this layout, and if reality must diverge, update this file in the same change
> (see [§6](#6-keeping-this-file-honest)).

---

## Contents

1. [Directory Tree](#1-directory-tree)
2. [The Four Placement Questions](#2-the-four-placement-questions)
3. [What Lives Where](#3-what-lives-where)
4. [File Placement Rules](#4-file-placement-rules)
5. [Naming Conventions](#5-naming-conventions)
6. [Keeping This File Honest](#6-keeping-this-file-honest)

---

## 1. Directory Tree

All application code lives under `src/`. The repo root holds only tooling config and the
directories that external tools require there (`supabase/`, `public/`, `e2e/`, `docs/`).

```text
redyquote/
├─ src/
│  ├─ app/                          # Next.js 16 App Router — ROUTES ONLY, no business logic
│  │  ├─ (auth)/
│  │  │  └─ login/page.tsx          # sign-in (Supabase Auth); the only pre-session route
│  │  ├─ (app)/                     # authenticated shell — every route here assumes a session
│  │  │  ├─ layout.tsx              # app chrome; reads session server-side
│  │  │  ├─ quotes/
│  │  │  │  ├─ page.tsx             # quote list        (Server Component — read)
│  │  │  │  ├─ loading.tsx          # list skeleton
│  │  │  │  ├─ error.tsx            # error boundary scoped to this route
│  │  │  │  ├─ _components/         # route-private UI (QuoteTable, filters) — not a route
│  │  │  │  ├─ new/page.tsx         # new quote        (hosts the builder)
│  │  │  │  └─ [id]/page.tsx        # quote detail     (hosts the builder)
│  │  │  ├─ products/               # product catalog + fab tiers   (admin-managed)
│  │  │  ├─ library/                # component library             (admin-managed)
│  │  │  └─ settings/               # rates, markups, branding      (admin-only)
│  │  ├─ layout.tsx                 # root layout — html/body shell, fonts
│  │  ├─ page.tsx                   # entry (redirect to /quotes or /login)
│  │  └─ globals.css                # Tailwind entry (`@import "tailwindcss"`)
│  ├─ proxy.ts                      # Next 16 middleware — Supabase session refresh
│  ├─ components/                   # React components used by 2+ routes
│  │  ├─ ui/                        # shadcn/ui primitives (Radix-based)
│  │  ├─ layout/                    # global chrome: Sidebar, Topbar
│  │  └─ quote-builder/             # the ONE rich client component — live recalc (ARCH §1)
│  ├─ lib/                          # framework-agnostic logic; no JSX, no React imports
│  │  ├─ pricing/                   # shared cost/margin calc — imported by client AND server
│  │  ├─ validation/                # Zod schemas for Server Action inputs (ARCH §5)
│  │  ├─ supabase/
│  │  │  ├─ server.ts               # session-bound server client (@supabase/ssr) — RLS applies
│  │  │  ├─ client.ts               # browser client
│  │  │  ├─ update-session.ts       # session-refresh helper called by src/proxy.ts
│  │  │  └─ types.ts                # generated DB types (`supabase gen types`) — no ORM
│  │  ├─ config.ts                  # env parsing (Zod) + app-wide constants
│  │  └─ utils.ts                   # formatters, small generic helpers
│  └─ server/                       # server-only code — never imported by a client component
│     └─ actions/                   # Server Actions — the SOLE mutation path (ARCH §1, §5)
│        ├─ quotes.ts               # save / submit / approve / mark-sent
│        ├─ products.ts             # save product (+ fab tiers, defaults, price history)
│        ├─ library.ts              # save library component
│        └─ settings.ts             # save settings, upload favicon
├─ supabase/                        # Supabase CLI project — must stay at repo root
│  ├─ migrations/                   # *.sql — tables, RLS policies, quote-number sequence, RPCs
│  └─ config.toml                   # local stack config
├─ e2e/                             # Playwright — quote flow, submit/approve gate
├─ docs/                            # source-of-truth docs (this file lives here)
│  └─ superpowers/                  # tool-owned path — the `superpowers` Claude Code plugin
│     ├─ specs/                     #   writes design specs here (YYYY-MM-DD-<topic>-design.md)
│     └─ plans/                     #   and implementation plans here, when first used

├─ public/                          # static assets
├─ package.json  tsconfig.json  next.config.ts
├─ eslint.config.mjs  postcss.config.mjs
└─ CLAUDE.md  README.md
```

**Why `src/`:** the root stays a pure tooling surface, and `src/**` gives lint, coverage, and
type-check globs one unambiguous anchor for "code we wrote." Next 16 supports `src/app` and
`src/proxy.ts` natively — no config beyond the `@/*` path alias.

**Path alias:** `@/*` → `./src/*` (tsconfig.json). Import as `@/lib/pricing`,
`@/server/actions/quotes`, `@/components/ui/button`.

Unit tests (Vitest) are **co-located** as `*.test.ts` next to the module under test — the
`src/lib/pricing/` calc function especially gets exhaustive coverage there. Playwright E2E
specs live in `e2e/`, separate from unit tests.

## 2. The Four Placement Questions

Every new file has exactly one home, decidable in one pass. Ask in order; first _yes_ wins:

| #   | Question                          | Goes in                                                          |
| --- | --------------------------------- | ---------------------------------------------------------------- |
| 1   | Is it a URL?                      | `src/app/` — and nothing that isn't a URL goes there             |
| 2   | Does it render JSX for 2+ routes? | `src/components/` (one route only → that route's `_components/`) |
| 3   | Does it write to the database?    | `src/server/actions/`                                            |
| 4   | Everything else                   | `src/lib/`                                                       |

Consequences worth stating outright:

- **`src/app/` contains only router files** — `page.tsx`, `layout.tsx`, `loading.tsx`,
  `error.tsx`, `route.ts`, and `_components/` folders. No actions, no helpers, no clients.
- **`src/server/` is a hard boundary.** Files there start with `import 'server-only'` so an
  accidental client import fails the build instead of leaking server code to the browser.
- **There is no `features/` directory.** With one shared-UI folder and one shared-logic folder,
  "components or features?" is never a question anyone has to answer.
- **No speculative folders.** A `hooks/` or `config/` directory earns existence when there are
  two real shared hooks or config outgrows `src/lib/config.ts` — not before.

## 3. What Lives Where

| Concern                       | Location                                              | Why                                                                                                  |
| ----------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Page/route reads              | `src/app/(app)/**/page.tsx` (Server Components)       | Read path; session-bound Supabase reads so RLS applies (ARCH §1)                                     |
| Writes of any kind            | `src/server/actions/*.ts` (Server Actions)            | Sole mutation path — no direct browser→Postgres writes (ARCH §5)                                     |
| Route-private UI              | `src/app/**/_components/`                             | Underscore keeps it out of the router; UI used by one route stays next to it                         |
| Shared pricing calc           | `src/lib/pricing/`                                    | One canonical formula imported by both the client preview and the server recompute (ARCH §1, §5)     |
| Input validation              | `src/lib/validation/` (Zod)                           | Single validation tool of record (ARCH §5, TECH-STACK §4)                                            |
| Supabase access               | `src/lib/supabase/`                                   | Session-bound clients via `@supabase/ssr`; no service-role key anywhere (ARCH §1)                    |
| Generated DB types            | `src/lib/supabase/types.ts`                           | `supabase gen types typescript`; regenerated after each migration — no ORM (TECH-STACK §4)           |
| Session refresh               | `src/proxy.ts` + `src/lib/supabase/update-session.ts` | Next 16 names the middleware entry `proxy.ts`; the reusable logic stays in `lib/`                    |
| Schema / RLS / RPC / sequence | `supabase/migrations/*.sql`                           | Authoritative schema; never hand-edited in the dashboard (ARCH §5, TECH-STACK §6)                    |
| Reusable UI                   | `src/components/` (`ui/` for shadcn)                  | Not route-specific                                                                                   |
| The live quote builder        | `src/components/quote-builder/`                       | Used by both `quotes/new` and `quotes/[id]`, and the only rich client component in the app (ARCH §1) |

## 4. File Placement Rules

Read these before creating any new feature, route, action, or component.

1. **A mutation goes in `src/server/actions/`, never in a component or route handler.** Server
   Actions are the sole write path (ARCH §5). If a new feature writes data, it adds/extends an
   action file here — not a client-side write, not a separate API route.
2. **Any code that computes a cost or margin imports from `src/lib/pricing/`.** Never inline a
   pricing formula in a component or an action. Client preview and server recompute must use
   the _same_ module so they agree; the server value is the trusted one (ARCH §1, §5).
3. **Every Server Action validates its input with a Zod schema from `src/lib/validation/`.** No
   hand-rolled validation (ARCH §5).
4. **Multi-row writes go through a Postgres RPC in `supabase/migrations/`, called from one
   action.** Quote (header + lines) and product (tiers + defaults + price history) saves are
   atomic RPC transactions — never sequential client-driven writes (ARCH §3, §5).
5. **Schema, RLS, the quote-number sequence, and RPC functions are SQL migration files only.**
   Add a new `supabase/migrations/*.sql`; regenerate `src/lib/supabase/types.ts` after. Never
   edit schema or RLS in the Supabase dashboard (ARCH §5, TECH-STACK §6).
6. **Default to a Server Component.** Add `"use client"` only where genuine interactivity needs
   it — realistically just `src/components/quote-builder/`. A new client component is a
   decision to justify, not a default (ARCH §1).
7. **Data access is session-bound.** Import the Supabase client from `src/lib/supabase/` —
   never construct a client with a service-role key; none exists in this app (ARCH §1).
8. **Nothing in `src/server/` is imported by a client component.** Keep `import 'server-only'`
   at the top of every file there. Client components may _invoke_ a Server Action (form
   `action=` / `useActionState`) — that's the supported path; a direct value import is not.
9. **Do not add a datastore, API layer, email/PDF, or analytics tool.** The stack is fixed in
   docs/TECH-STACK.md §5; anything not listed there is out of scope until that file changes.
10. **No `tenant_id` or per-tenant scaffolding.** Single-tenant by design (ARCH §4).

## 5. Naming Conventions

- **Routes** — kebab-case folder segments under `src/app/`; `page.tsx` for the view,
  `layout.tsx` for shared chrome. Route groups `(auth)` / `(app)` separate the pre-session and
  authenticated surfaces without affecting the URL.
- **Route-private UI** — `_components/` inside the route folder. The underscore makes it a
  private folder Next excludes from routing, so route-local UI can never become a URL by
  accident. PascalCase filenames (`QuoteTable.tsx`).
- **Action files** — one file per aggregate in `src/server/actions/` (`quotes.ts`,
  `products.ts`, …), named after the domain object they mutate. The library-component actions
  file is `library.ts`, matching its route — **not** `components.ts`, which would read as a
  collision with `src/components/`.
- **Migrations** — Supabase CLI default `NNNN_snake_case_description.sql`; ordering is by the
  numeric prefix. One logical change per migration.
- **`src/lib/` modules** — no JSX, no React imports; pure TypeScript so they're unit-testable
  and reusable across client and server. The `library/` _route_ (component library UI) is a
  distinct thing from `lib/` — don't conflate them.
- **Middleware** — the entry file is `src/proxy.ts`, Next 16's name for it. Next 16.2 still
  accepts `middleware.ts`; use `proxy.ts` so the repo has one name for one thing, and keep the
  reusable session logic in `src/lib/supabase/update-session.ts`.
- **Tests** — `*.test.ts` co-located for Vitest units; `*.spec.ts` under `e2e/` for Playwright.
- **Docs** — top-level `docs/*.md` are the source-of-truth docs, named by content in
  SCREAMING-KEBAB (`ARCHITECTURE.md`, `TECH-STACK.md`). `docs/superpowers/**` is the one
  exception: it is **named after the tool, not the content**, because the `superpowers`
  Claude Code plugin hardcodes that path (`specs/` from its brainstorming skill, `plans/`
  from writing-plans). Deliberately left alone — renaming it would just make the plugin
  recreate the folder and split specs across two places. A spec there can still be
  authoritative: `2026-07-23-authorization-matrix-design.md` amends PRD-010 and
  ARCHITECTURE §2/§7, so it is listed in CLAUDE.md alongside the top-level docs.

## 6. Keeping This File Honest

Most of this layout is intended, not yet built. When you create real directories:

- If they match this file, no change needed.
- If reality must diverge (a rename, a split, a new top-level dir), **update this file in the
  same change** and note why — a stale structure doc is worse than none.
- Editing this file is a deliberate decision, like any `docs/` change (CLAUDE.md): call it out,
  don't fold a structural change silently into unrelated feature work.
