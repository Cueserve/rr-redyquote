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

**Last verified: 2026-08-08.** Confirm a file or script still exists before relying on this
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
    A `PreToolUse` hook blocks this for committed migrations — see the machine-enforced
    bullet under "Claude Code-specific config". The rule is still yours to keep: the hook
    only knows what is _committed_, so a migration pushed but not yet committed is unguarded.
  - **`npm run db:types` works, and a failed run is now safe.** It calls `npx supabase`, not a
    bare `supabase`, generates to `types.ts.tmp` and renames only on exit 0, then pipes through
    Prettier with `--end-of-line crlf` — so no manual follow-up is needed. A failure (no
    network, project unlinked) leaves `types.ts` untouched; the CLI's JSON error blob lands in
    the gitignored `.tmp` instead. Re-run it once connected — don't hand-edit `types.ts`.
- **One validation module — `src/lib/validation/settings.ts`** (PR #3). A Zod schema over the
  eight numeric `settings` columns, mirroring the named CHECK constraints in `0003`/`0004`, and
  consumed only by the settings Defaults tab. `zod@^4` is a real dependency now, so a second
  module adds no new tool. Read it before writing one — it is the shape to copy, and two of its
  choices are load-bearing rather than incidental: the edit buffer stays a **string** until
  submit (parsing per keystroke eats a half-typed `2.`, which puts the 2.5 cushion out of
  reach), and there are **no upper bounds**, because PRD §2A has not fixed the sane ranges and a
  wrong ceiling is worse than none.
  - **It validates a form, not a write.** No Server Action consumes it, because none exists.
    The database is still the enforcement boundary; this only tells an admin which field is
    wrong before a round trip. Wiring the save path does not get to skip re-validating
    server-side.
- **Tooling** — Prettier, Husky + lint-staged, ESLint with the `ui/` boundary and
  semantic-token rules.

**Not built.** No `src/server/actions/`, no `src/lib/pricing/`,
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

- **Commands** (script list verified 2026-08-01, the `db:*` lines re-verified 2026-08-08 —
  `package.json` is the authority; don't invent scripts):
  - Run clean: `npm run dev`, `build`, `lint`, `typecheck`, `format`, `format:check`, `start`.
  - `npm run test` exits 0 but proves nothing — it is `vitest run --passWithNoTests` and there
    are no tests. Treat a green `test` as "not run", not "passed" (docs/TODO.md §A.2).
  - `npm run db:push` / `db:types` both run, and the project is linked. Migrations `0001`–`0004`
    are applied, so `db:push` has **nothing pending**; `db:types` regenerates against the real
    applied schema and `types.ts` is current (see "Built" above, which is the authority on
    schema state — don't duplicate the migration list here, it rots).
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
    already-applied migration file — a new change is a new file. Both halves have an
    enforcement layer below: `permissions.ask` forces a prompt on any `db push` spelling, and
    the `PreToolUse` hook blocks edits to committed migrations. The prompt is a speed bump,
    not the review — it does not show anyone the SQL.
  - There is deliberately **no `npm run db:migrate`** wrapper: a one-liner that pushes
    unreviewed SQL is the thing this command exists to prevent.
- **No local Supabase stack.** Development runs against a hosted project; Docker is not
  installed. Never suggest `supabase start` or `db reset` as a current step — see
  [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md) §4 for the deferred adoption plan.
- **Building UI has its own section below.** `.claude/settings.json` is the authority on which
  plugins every developer gets; see "Building UI" for which of them touch design and how.
- **Secrets:** never read, print, or write `.env`, `.env*.local`, or any file holding the
  Supabase service-role key or other credentials.
- **Three of the rules above are machine-enforced now, not advisory** — `permissions` in
  [.claude/settings.json](.claude/settings.json) plus one `PreToolUse` hook,
  [.claude/hooks/block-applied-migration.mjs](.claude/hooks/block-applied-migration.mjs).
  Verified live 2026-08-08. This is a floor under the rules, not a replacement for reading them.
  - **Applied migrations are unwritable.** The hook denies `Write`/`Edit` on any
    `supabase/migrations/*.sql` committed to `HEAD` — the proxy for "applied", since this repo
    pushes then commits. A new migration stays editable until it is committed. It fails open
    when git is unavailable, so it hardens the immutability rule above without replacing it.
  - **`.env` and `.env*.local` are denied for read _and_ write**; `.env.example` is
    deliberately still readable. Consequence: Claude also cannot delete or rotate
    `.env.local` — lift the rule in `permissions.deny` first, or do it by hand.
  - **`db push` in any spelling forces a prompt** — `permissions.ask`, not `deny`, because
    `deny` would break `/db-migrate` itself, which runs `npm run db:push` at its push step.
  - Writing another hook: use the **shell form** (`"command": "node path/to.mjs"`). The exec
    form (`"command": "node", "args": [...]`) silently never fires here — indistinguishable
    from a hook that approved. Prove a new hook fires before trusting it.
- **Editing source-of-truth docs:** changes to anything in `docs/` are deliberate decisions,
  not incidental edits during feature work — call them out and get approval, don't fold them
  into an unrelated change.

## Building UI

Four steps, in order. Only the last two are plugin decisions.

**1. `/impeccable shape` first — required, not optional.**
Every piece of **UI-bearing** work starts here: a new route, a new screen, or a new
user-facing component. `shape` plans the UX, information architecture, and states _before_
any code exists, and it **writes no code** — which is precisely why it is allowed when the
rest of impeccable's generating commands are not (step 4). Backend-only work is **exempt**:
a migration, a Server Action, or a `src/lib/` module follows the `docs/` +
[docs/PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md) path instead, because `shape` has no
useful output for something with no surface.

- **It is an interview, not a one-shot.** `shape` opens with a discovery round and asks 2–3
  questions at a time, then waits. Budget for the conversation; firing it off and walking away
  gets you nothing. `docs/PRODUCT.md` and `docs/PRD.md` shorten it by answering questions in
  advance, but they do not replace it — `shape` is task-specific and PRD-level scope is not a
  design brief.
- **The output is a design brief, and you must explicitly confirm it.** The skill's own gate
  treats an unconfirmed brief as a failure — a brief the tool drafted and nobody agreed to is
  not a plan. Put the confirmed brief in the PR or the issue: it is the design rationale a
  reviewer needs, and writing the "why" down is already this repo's convention (see the
  comment style in any `src/components/ui/` file).
- **Order against `superpowers:brainstorming`, which also claims to go first.** Brainstorming
  settles _what_ to build and _why_; `shape` settles _what it looks like and how it behaves_.
  Requirement still open → brainstorming, then `shape`. Requirement already pinned by
  [docs/PRD.md](docs/PRD.md) — the normal case here — → straight to `shape`.
- **If `shape` ever routes you to `/impeccable teach`, stop.** That is the skill's documented
  fallback when its context gate fails, and `teach` is forbidden here (step 4). The gate
  passes because `docs/PRODUCT.md` exists and `.claude/settings.json` pins
  `IMPECCABLE_CONTEXT_DIR=docs` — verified 2026-08-08. Being routed to `teach` means the
  context broke; fix the context, never run the command.
- **`shape` plans around an open decision, it cannot close one.** Two are still open and block
  the work it would plan: the pricing formula (PRD §2A) and the fixed-category list
  (PRD-007A). See docs/DATABASE.md §6.

**`/impeccable craft` is banned — use `shape` instead.** `craft` is `shape` plus an end-to-end
build, and the build half is exactly what step 4 prohibits: impeccable does not write UI in
this repo. Run `shape`, then build it yourself through steps 2 and 3. The ban is about
provenance, not output quality — a screen assembled from `src/components/ui/` and the token
layer is reviewable against the design system line by line; one generated wholesale is not,
and it is the fastest route to a hardcoded color or an off-scale type size landing unnoticed.

**2. The design system decides how it looks — always.**
[docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) → the tokens in `src/app/globals.css` → the
`no-restricted-syntax` rule in `eslint.config.mjs`. Every color, font, radius, and type size
comes from there. Never a hex literal, never a raw Tailwind color class (`bg-slate-100`), never
a Google Font — brand values are Archivo + IBM Plex Mono, and colors come from the semantic
layer (`bg-background`, `text-muted-foreground`, …). Adding a token is a DESIGN-SYSTEM.md
change requiring approval, per "Editing source-of-truth docs" above. No plugin, skill, or CLI
output authorizes one.

**3. shadcn/ui builds it.** This is a shadcn project: [components.json](components.json) at the
root (style `radix-nova`, `cssVariables: true`), `shadcn@4` as a devDependency, and the 15
primitives in `src/components/ui/` are shadcn components already adapted to our tokens.

- **Reuse before you add.** Check `src/components/ui/` first, then extend a primitive with a
  `cva` variant — see the `editable` variant in
  [src/components/ui/input.tsx](src/components/ui/input.tsx) — before pulling in a new one.
- **Adding a primitive:** `npx shadcn@latest add <name>`. Its output is compatible by
  construction: shadcn names its tokens exactly as `globals.css` defines them (`background`,
  `card`, `popover`, `primary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`,
  `chart-1`–`5`, `sidebar-*`), which is why generated components pass lint. Still read the diff
  before committing — a generated file needs our comment-the-why convention, and any hardcoded
  color in it is a bug, not a starting point.
- **`frontend-design@claude-plugins-official` is optional taste input** for a genuinely new
  screen: hierarchy, restraint, avoiding the AI-default look. It picks no values. Skip it when
  editing a screen that already exists, which is most of the work here.

**4. `impeccable@impeccable` audits the result — it never writes it.** `/impeccable audit` and
`/impeccable critique` are the sanctioned entry points; `npx impeccable detect src/` is the
deterministic CLI check (exit `2` means findings, `--json` for tooling). Do not use
`/impeccable craft`, `/impeccable polish`, or any of its other generating commands to build
UI, whatever its own description advertises. **`shape` (step 1) is the single exception, and
only because it emits a plan rather than code.**

- **Its context is pinned to `docs/`.** `.claude/settings.json` sets
  `env.IMPECCABLE_CONTEXT_DIR=docs`, so impeccable's skill loader always reads
  [docs/PRODUCT.md](docs/PRODUCT.md). Without the pin a `PRODUCT.md`, `DESIGN.md`, or
  `.impeccable.md` landing at the repo root silently wins and `docs/PRODUCT.md` stops being
  read, which fails impeccable's product gate and routes it to `/impeccable teach`. **Never run
  `teach` or `document`** — both write context files, and `document` writes `DESIGN.md`.
- **The baseline is clean — treat any new finding as real.** Verified 2026-08-05 against
  `impeccable@3.5.0`: `npx impeccable detect src/` returns **zero** findings and exit 0. That is
  not luck. Most of its high-signal detectors (`ai-color-palette`, `gray-on-color`,
  `cream-palette`) key on raw Tailwind palette classes, and `eslint.config.mjs` already makes
  those unwritable — ESLint gets there first, structurally. So there is no standing noise to
  triage and **no pre-seeded suppression list**. A finding means something got past lint.
  - Suppress only after establishing the finding contradicts
    [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md), and then never by changing a token: run
    `npx impeccable ignores add-rule <rule>`, which writes `detector.ignoreRules` into
    `.impeccable/config.json` — or an `impeccable-disable-next-line <rule>` comment for a
    genuine one-off. `.impeccable/config.json` **exists and is committed** as of 2026-08-08,
    carrying exactly one entry — see the next bullet. The command's `--local` scope writes
    `.impeccable/config.local.json`, which is per-developer and gitignored — never put a team
    decision there. **Always report what you suppressed and why.**
  - **`--reason` does not work on `add-rule`** — it is accepted silently and dropped (the CLI
    stores reasons only for `add-value`). So the rationale goes in a `$comment` key at the top
    of `config.json`, which the parser ignores harmlessly; this is verified, not assumed. Keep
    writing it there: an unexplained suppression is indistinguishable from a mistake.
  - **Three rules are suppressed, all verified false positives, all repo-wide.**
    `ignoreRules` has no per-file scope (only `ignoreValues` does), so repo-wide is the
    granularity the tool offers. Full rationale and the blind spot each one creates is in the
    `$comment` of [.impeccable/config.json](.impeccable/config.json).
    `npx impeccable detect <path-or-url> --no-config` bypasses the config and is the way to
    audit what is being hidden. **Read the blind spots before adding a fourth — four
    suppressions out of one detector set is a signal about tool fit, not a free action.**
    - `cramped-padding` and `nested-cards` both fire on the **same** element: the DataTable's
      scroll wrapper in `src/components/ui/data-table.tsx`. It carries no padding deliberately
      (an inset peels the `bg-muted` header off its border, DESIGN-SYSTEM.md §7.11), and its
      bordered, rounded, **transparent** shell reads to the detector as a card whenever a table
      sits inside a `Card`. Verified false: `[data-slot=card] [data-slot=card]` is 0 on every
      route. `nested-cards` is on impeccable's absolute-ban list, so this is the costliest of
      the three — a real nested card would now pass unnoticed.
    - `clipped-overflow-container` fires on any `position: absolute` child of the app shell's
      `overflow-hidden` div, which is **every `sr-only` element** — and being clipped is the
      whole point of `sr-only`. Confirmed twice by A/B test. Every workaround traded
      screen-reader output for a quieter detector, which is the wrong trade.
  - **`em-dash-overuse` on `/quotes/new` is known, deliberate noise — do not suppress it.**
    It counts 42 em-dashes; 40 are the `—` placeholder glyphs in table cells and only 2 are
    prose, so it is wrong about AI cadence. It is `advisory: true`, so the route still exits
    **0** and the exit-code contract holds. Left in place because it is what surfaced the 40
    dash cells that announced as silence to a screen reader (now fixed via `EmptyValue`).
- **Static scanning cannot check contrast here — that gap is real and known.** `low-contrast`
  and `gray-on-color` need two resolved colors. Our components use semantic tokens, which
  resolve at runtime from `src/app/globals.css`, so a `detect src/` pass sees no color pair and
  stays silent. It is not confirming the WCAG AA floor in DESIGN-SYSTEM.md; it is skipping the
  question.
  - To actually check contrast, audit the rendered page: `npm run dev`, then
    `npx impeccable detect http://localhost:3000/<route>`. **Nothing to install:** `puppeteer`
    is an `optionalDependency` of `impeccable`, so `npx` already pulls it into its own cache
    (verified 2026-08-08 — URL mode launches Chrome with no separate install). Should it ever
    go missing, install it outside the project; never into `package.json`, which is what
    impeccable's own `npm install puppeteer` error message would have you do (it is not in
    TECH-STACK.md).
  - The four `design-system-*` rules are also inert: impeccable builds its font/color/radius
    allowlists from the **YAML frontmatter** of a `DESIGN.md` (repo root, then
    `.agents/context/`, then `docs/`) and bails the moment that frontmatter is missing — the
    markdown body is never read for this. We have `docs/DESIGN-SYSTEM.md`: different filename,
    no frontmatter. Leaving it inert is the current, deliberate choice; a second
    machine-readable copy of the token values would drift from DESIGN-SYSTEM.md, and ESLint
    already enforces the same constraint. Do not create `DESIGN.md`, rename DESIGN-SYSTEM.md
    to it, or add frontmatter, without approval.

**Ship gate:** `npm run lint` and `npm run typecheck`. A suggestion that fails lint was never a
valid suggestion.

`superpowers@claude-plugins-official` is the third plugin on the roster — process guidance, not
a design layer.
