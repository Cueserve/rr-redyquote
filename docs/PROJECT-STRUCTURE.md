# PROJECT-STRUCTURE.md — Directory Layout & File Placement

**Owner:** Viral Parikh
**Last updated:** 2026-07-31
**Source of truth for:** where each kind of file lives and the rules for placing new code —
so features and components land in the right place and don't break the invariants in
docs/ARCHITECTURE.md.

> Derived from: docs/ARCHITECTURE.md, docs/TECH-STACK.md
> Downstream: README.md, CLAUDE.md

---

> **Mostly built, as of 2026-08-01.** `src/app/` (all routes), `src/components/`, `src/lib/`,
> `src/proxy.ts`, `supabase/`, `docs/`, and root config all exist. `supabase/migrations/`
> now holds `0001`–`0004`; `0005` onward — categories, products, quotes, RPCs — is
> untranscribed. **Which of those files have reached the remote is tracked in CLAUDE.md's
> "Project state", not here.** This file describes layout; push state restated in a second
> place has already drifted once.
> Still missing: **`src/server/`** — no Server Action has been written, so the app's entire
> write path is unbuilt — plus `e2e/`.
>
> Two directories in the tree below are **prototype scaffolding on a delete-when path**, not
> permanent structure: `src/lib/mock/` and `src/components/prototype/`. They exist because the
> UI was designed before the data layer; both go away when Server Components read real data.
>
> When you create a directory, follow this layout; if reality must diverge, update this file
> in the same change (see [§6](#6-keeping-this-file-honest)).

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

Legend: unmarked = exists · `[ ]` = not built yet · `[~]` = partly built · `[tmp]` = prototype
scaffolding, delete when the data layer lands.

```text
redyquote/
├─ src/
│  ├─ app/                          # Next.js 16 App Router — ROUTES ONLY, no business logic
│  │  ├─ (auth)/
│  │  │  └─ login/page.tsx          # sign-in (Supabase Auth); the only pre-session route
│  │  ├─ (app)/                     # authenticated shell — every route here assumes a session
│  │  │  ├─ layout.tsx              # app chrome; [ ] server-side session check
│  │  │  ├─ not-found.tsx           # 404 boundary for every authenticated route
│  │  │  ├─ _components/            # AppChrome — Sidebar + Topbar + scroll area
│  │  │  ├─ quotes/
│  │  │  │  ├─ (list)/              # route group isolating list-only loading boundary
│  │  │  │  │  ├─ page.tsx          # quote list        (Server Component — read)
│  │  │  │  │  └─ loading.tsx       # list loading UI scoped to /quotes only
│  │  │  │  ├─ error.tsx            # error boundary scoped to this route
│  │  │  │  ├─ _components/         # route-private UI (QuoteTable) — not a route
│  │  │  │  ├─ new/page.tsx         # new quote        (hosts the builder)
│  │  │  │  └─ [id]/page.tsx        # quote detail     (hosts the builder)
│  │  │  ├─ products/               # list + [id] detail + _components/  (admin-managed)
│  │  │  ├─ library/                # list + [id] detail + _components/  (admin-managed)
│  │  │  └─ settings/               # rates, markups, branding, audit    (admin-only edit)
│  │  ├─ layout.tsx                 # root layout — html/body shell, fonts
│  │  ├─ page.tsx                   # entry (redirect to /quotes or /login)
│  │  └─ globals.css                # Tailwind entry + the three-tier token layer
│  ├─ proxy.ts                      # Next 16 middleware — Supabase session refresh only
│  ├─ components/                   # React components used by 2+ routes
│  │  ├─ ui/                        # shadcn/ui primitives (Radix-based) — app-agnostic
│  │  ├─ layout/                    # global chrome: Sidebar, Topbar, PageHeader/PageBody
│  │  ├─ quote-builder/             # the ONE rich client component — live recalc (ARCH §1)
│  │  ├─ prototype/            [tmp]# role switch — an affordance toggle, NOT authorization
│  │  ├─ quote-status-badge.tsx     # lifecycle → Badge; app-specific, so not in ui/
│  │  └─ freshness-badge.tsx        # PRD-009 Current/Aging/Re-quote + Deactivated
│  ├─ lib/                          # framework-agnostic logic; no JSX, no React imports
│  │  ├─ pricing/               [ ] # shared cost/margin calc — blocked on PRD §2A
│  │  ├─ validation/            [ ] # Zod schemas for Server Action inputs (ARCH §5)
│  │  ├─ mock/                 [tmp]# fixtures standing in for the read path
│  │  ├─ supabase/
│  │  │  ├─ server.ts               # session-bound server client (@supabase/ssr) — RLS applies
│  │  │  ├─ client.ts               # browser client
│  │  │  ├─ update-session.ts       # session-refresh helper called by src/proxy.ts
│  │  │  └─ types.ts                # generated DB types (`supabase gen types`) — no ORM
│  │  ├─ config.ts                  # env parsing (Zod) + app-wide constants
│  │  └─ utils.ts                   # cn() + display formatters (money, percent, dates)
│  └─ server/                   [ ] # server-only code — never imported by a client component
│     └─ actions/               [ ] # Server Actions — the SOLE mutation path (ARCH §1, §5)
│        ├─ quotes.ts               # save / submit / approve / mark-sent
│        ├─ products.ts             # save product (+ fab tiers, defaults, price history)
│        ├─ library.ts              # save library component
│        └─ settings.ts             # save settings, upload favicon
├─ supabase/                        # Supabase CLI project — must stay at repo root
│  ├─ migrations/               [~] # *.sql — 0001–0004; 0005+ categories/products/quotes/RPCs TBD
│  └─ config.toml                   # local stack config
├─ e2e/                         [ ] # Playwright — quote flow, submit/approve gate
├─ docs/                            # source-of-truth docs (this file lives here)
│  ├─ DATABASE.md                   #   the data model — permanent
│  ├─ DATABASE-SQL.md          [tmp]#   its DDL — deleted once migrations are authored
│  ├─ …                             #   PRODUCT, PRD, ARCHITECTURE, TECH-STACK, DESIGN-SYSTEM,
│  │                                #   ENVIRONMENTS, TODO — all permanent
│  └─ superpowers/                  # tool-owned path — the `superpowers` Claude Code plugin
│     ├─ specs/                     #   writes design specs here (YYYY-MM-DD-<topic>-design.md)
│     └─ plans/                 [ ] #   and implementation plans here, when first used
├─ public/                          # static assets — brand imagery only, see the note below
│  └─ redyref-logo.png              #   full lockup (1442×817) — wordmark + hand + tagline
├─ .claude/                         # Claude Code config — tool-owned path
│  └─ commands/                     # Home for the slash commands (like `db-migrate.md` → `/db-migrate`)
├─ package.json  tsconfig.json  next.config.ts
├─ eslint.config.mjs  postcss.config.mjs  .prettierrc  .husky/
└─ CLAUDE.md  README.md
```

**Quotes loading boundary rule.** Keep quote-list loading UI inside `quotes/(list)/loading.tsx`
only. A `quotes/loading.tsx` boundary wraps the whole subtree, including `[id]`; once a
streamed response starts, status is committed and `notFound()` in `quotes/[id]` can render the
404 UI with **HTTP 200**. The current route-group split prevents that by leaving detail routes
outside the list-loading boundary.

**`public/` holds the REDYREF brand imagery and nothing else.** The five `create-next-app`
SVGs were deleted on 2026-07-31 (docs/TODO.md §C.1); the folder then sat empty — and therefore
absent from a fresh clone, since git does not track empty directories — until the logo landed
on 2026-08-01. The favicon is _not_ here: it lives at `src/app/favicon.ico`, the Next App
Router convention. Keep this folder to assets the browser fetches by URL; anything a component
can import belongs under `src/`.

One file:

- **`redyref-logo.png`** — the supplied lockup, 1442×817 RGBA with a genuinely transparent
  background. Use it where there is width for the "interactive kiosks" tagline.

The sidebar now uses this same lockup file directly, and the logo chip in
`src/components/layout/sidebar.tsx` still paints a light surface behind it so the black mark
maintains contrast against the dark rail.

**`src/app/favicon.ico` is a synthesized mark, not the logo.** Replaced on 2026-08-01; the
prior file was the `create-next-app` default. A favicon renders at 16px, where the letterboxed
lockup is an unreadable smear — so the icon is a **white `R` knocked out of a solid `#ad0000`
tile**, the `R` lifted from the wordmark's first letterform (`x 182..338, y 137..342` of the
lockup) and centred at 168px on a 256px canvas. It is a **4-entry ICO — 16/32/48/256px, each
entry PNG-encoded** (the Vista+ form; every current browser reads it). Two things to know
before touching it:

- **REDYREF has no square brand mark.** This single letter was invented to fill that gap and
  has not been through brand review. If a real square mark ever arrives, it wins — replace
  this rather than reconciling with it.
- **`sharp` cannot write ICO.** It is used to render the four PNGs; the ICONDIR/ICONDIRENTRY
  container is assembled by hand. Don't expect a one-line `sharp(...).toFile('*.ico')` to work.

No intermediate PNG is committed — the icon is regenerable from `public/redyref-logo.png`
alone.

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

| Concern                       | Location                                              | Why                                                                                                                                        |
| ----------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Page/route reads              | `src/app/(app)/**/page.tsx` (Server Components)       | Read path; session-bound Supabase reads so RLS applies (ARCH §1)                                                                           |
| Writes of any kind            | `src/server/actions/*.ts` (Server Actions)            | Sole mutation path — no direct browser→Postgres writes (ARCH §5)                                                                           |
| Route-private UI              | `src/app/**/_components/`                             | Underscore keeps it out of the router; UI used by one route stays next to it                                                               |
| Shared pricing calc           | `src/lib/pricing/`                                    | One canonical formula imported by both the client preview and the server recompute (ARCH §1, §5)                                           |
| Input validation              | `src/lib/validation/` (Zod)                           | Single validation tool of record (ARCH §5, TECH-STACK §4)                                                                                  |
| Supabase access               | `src/lib/supabase/`                                   | Session-bound clients via `@supabase/ssr`; no service-role key anywhere (ARCH §1)                                                          |
| Generated DB types            | `src/lib/supabase/types.ts`                           | `supabase gen types typescript`; regenerated after each migration — no ORM (TECH-STACK §4)                                                 |
| Session refresh               | `src/proxy.ts` + `src/lib/supabase/update-session.ts` | Next 16 names the middleware entry `proxy.ts`; the reusable logic stays in `lib/`                                                          |
| Schema / RLS / RPC / sequence | `supabase/migrations/*.sql`                           | Authoritative schema; never hand-edited in the dashboard (ARCH §5, TECH-STACK §6)                                                          |
| Reusable UI                   | `src/components/` (`ui/` for shadcn)                  | Not route-specific                                                                                                                         |
| The live quote builder        | `src/components/quote-builder/`                       | Used by both `quotes/new` and `quotes/[id]`, and the only rich client component in the app (ARCH §1)                                       |
| App chrome                    | `src/components/layout/`                              | Sidebar, Topbar, PageHeader/PageBody — global shell, and allowed to be app-aware in a way `ui/` structurally can't be                      |
| Domain → UI mappings          | `src/components/*.tsx` (top level)                    | `quote-status-badge`, `freshness-badge`. `ui/` must stay app-agnostic — it knows `warning`, never "Pending approval" (DESIGN-SYSTEM §13.4) |
| Prototype scaffolding         | `src/lib/mock/`, `src/components/prototype/`          | Quarantined in named folders so the delete is one `rm -r` each, not a hunt. Nothing outside them may assume they exist                     |

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
- **Docs** — top-level `docs/*.md`, named by content in SCREAMING-KEBAB
  (`ARCHITECTURE.md`, `TECH-STACK.md`). Two things about this folder are worth stating
  precisely, because they are easy to conflate:

  **Permanent vs. transient is a property of the file, not its folder.** Almost everything in
  `docs/` is a permanent source-of-truth doc. A few files are **specs**: authoritative for
  what they cover, but deleted once their content lands in whatever they feed.
  `DATABASE-SQL.md` is one — it holds the DDL for `DATABASE.md`'s model and goes away when
  `supabase/migrations/*.sql` is authored, because ARCHITECTURE §5 makes the migrations the
  authoritative schema and a second copy of the same SQL would drift. Every transient file
  declares it in its own header **and** is listed in CLAUDE.md's "Approved design specs"
  block. Don't add one without doing both; don't assume a `docs/*.md` is permanent without
  checking that list.

  **`docs/superpowers/**` is named after the tool, not the content** — the `superpowers`
  Claude Code plugin hardcodes that path (`specs/` from its brainstorming skill, `plans/`
  from writing-plans). Deliberately left alone: renaming it would just make the plugin
  recreate the folder and split specs across two places. That is a reason to leave **plugin
  output** there, and not a reason to put hand-authored files there — the futility argument
  only applies to files something else would recreate. So
  `2026-07-23-authorization-matrix-design.md` stays (the plugin wrote it) while
  `DATABASE-SQL.md` sits beside the `DATABASE.md` it implements. Neither placement affects
  authority; CLAUDE.md's list does.

## 6. Keeping This File Honest

Most of this layout now exists. The remaining gaps are marked `[ ]` in [§1](#1-directory-tree),
and the two `[tmp]` directories are on a delete-when path. When you create real directories:

- If they match this file, no change needed.
- If reality must diverge (a rename, a split, a new top-level dir), **update this file in the
  same change** and note why — a stale structure doc is worse than none.
- Editing this file is a deliberate decision, like any `docs/` change (CLAUDE.md): call it out,
  don't fold a structural change silently into unrelated feature work.

**This file went stale once already**, and it is worth knowing how: the §1 banner still
described a bare `create-next-app` scaffold after `src/components/`, `src/lib/`,
`src/proxy.ts`, and `supabase/` had all been built. The layout itself was right the whole
time — only the "does not exist yet" claims rotted. That is the failure mode to watch for
here: not a wrong tree, but a correct tree wrapped in stale prose about what has been done.
Prefer a dated marker on a specific line over a blanket disclaimer at the top.
