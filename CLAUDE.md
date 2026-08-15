# CLAUDE.md — RedyQuote

Claude Code reads this file automatically from the repo root. It is the single home for
working rules; product and architecture facts live in `docs/`.

**Last verified against the filesystem: 2026-08-15.** Confirm a file or script still exists
before relying on a claim here — a stale instruction is worse than none.

---

## 1. Read this first — routing by task

Find the row for what you are about to do. Read the "Read before you start" column, then come
back. **Never derive an architecture, stack, or schema decision from memory.**

| Task                                          | Read before you start                                                                              | Section here |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------ |
| A new route, screen, or user-facing component | `/impeccable shape` first → [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) → `src/components/ui/`  | §6           |
| Editing an existing screen                    | [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) §7 + the component's own header comment             | §6           |
| Adding a `ui/` primitive                      | [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) + `src/components/ui/input.tsx` (the `cva` pattern) | §6           |
| Anything that reads or writes a table         | [docs/DATABASE.md](docs/DATABASE.md) + the relevant `supabase/migrations/*.sql`                    | §5, §7       |
| A Server Action, RLS policy, or role check    | [docs/specs/2026-07-23-authorization-matrix.md](docs/specs/2026-07-23-authorization-matrix.md)     | §4, §5       |
| A migration                                   | [docs/DATABASE.md](docs/DATABASE.md) §5–6 + §7 below — **merge → then apply**                      | §7           |
| Any pricing or margin math                    | **Stop.** PRD §7A is unsigned — see §4 "Blocked"                                                   | §4           |
| Where does this new file go?                  | [docs/PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md) §2 "Four Placement Questions"               | —            |
| Validation for any external input             | `src/lib/validation/settings.ts` — the shape to copy                                               | —            |
| A list screen (sort / filter / pagination)    | `src/lib/list/` — already built, do not rebuild                                                    | §3           |
| Adding or removing a package                  | [docs/TECH-STACK.md](docs/TECH-STACK.md) — a change there lands first, in its own PR               | §4           |

### Source-of-truth docs

Permanent, in lineage order. Each file's header names its own `Derived from:` / `Downstream:`.

- [docs/PRODUCT.md](docs/PRODUCT.md) — problem statement, scope, success criteria
- [docs/PRD.md](docs/PRD.md) — requirements and feature scope
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system structure and design decisions
- [docs/TECH-STACK.md](docs/TECH-STACK.md) — approved technologies and usage rules
- [docs/ENGINEERING-RULES.md](docs/ENGINEERING-RULES.md) — coding conventions, banned patterns, testing
- [docs/PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md) — directory layout and file placement
- [docs/DATABASE.md](docs/DATABASE.md) — the data **model**; the DDL is `supabase/migrations/`
- [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) — brand tokens, semantic-token rule, WCAG AA floor
- [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md) — which Supabase environment dev runs against

[`CONTRIBUTING.md`](CONTRIBUTING.md) owns process: branching, commits, review flow, the
self-review gate, and the documentation-change process.

`README.md` and [docs/BACKLOG.md](docs/BACKLOG.md) **restate; they own nothing.**

### Design specs — transient, and each one says so

Same authority as the docs above for the slice they cover. Every spec must appear in this
table; a spec not listed here has no declared authority.

| Spec                                                                                                     | Status                                         | What it governs                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [2026-07-23-authorization-matrix](docs/specs/2026-07-23-authorization-matrix.md)                         | Approved; DB half built, actions not           | The complete two-role (`rep`/`admin`) model. **Amends** PRD-010 and ARCHITECTURE §2/§7 — the base text it amends is superseded, not authoritative                                                                                                             |
| [2026-08-01-branding-assets-upload](docs/specs/2026-08-01-branding-assets-upload.md)                     | **Draft** — design only, nothing built         | Settings→Branding logo/favicon upload. No code wiring and no migration are in scope                                                                                                                                                                           |
| [implemented/2026-08-09-list-sort-pagination](docs/specs/implemented/2026-08-09-list-sort-pagination.md) | **Implemented and fully absorbed** — deletable | List sort, pagination, URL filter state. **Already shipped in PR #38 — do not build it.** Every durable claim now lives in ARCHITECTURE.md §4/§4.1 and PROJECT-STRUCTURE.md §6; the file is retained only until someone deletes it, and its own §0 is the map |

A spec's content moves into what it feeds once fully incorporated, and it leaves this table in
the same change. Between "designed" and "deleted" it may sit in `docs/specs/implemented/` —
see [that folder's README](docs/specs/implemented/README.md) for the three-state rule.
**Don't add a transient file to `docs/` without adding it here.**

**`docs/DATABASE-SQL.md` was retired on 2026-08-13 and nothing replaces it.** Do not recreate
it, and **do not add SQL back to `docs/`** — a second copy of the schema is the drift that rule
exists to prevent, and this one produced two bugs before it went. Its three homeless pieces
moved to permanent homes: `environment_mismatch` → DATABASE.md §5.6; the RLS-hardening trap →
DATABASE.md §6.2; the six untested database invariants → ENGINEERING-RULES.md §3.

---

## 2. Project state

**Verified 2026-08-15.** The `@/*` alias resolves to `./src/*`.

### Built

- **UI, end to end but unwired.** All routes under `src/app/(app)/` (quotes list, quote
  builder, products, component library, settings), `src/app/(auth)/login/`, the app shell, and
  **18 primitives** in `src/components/ui/`. Every screen reads from **`src/lib/mock/`**.
- **Token layer** — `src/app/globals.css`, enforced by `eslint.config.mjs`.
- **Supabase plumbing** — `src/lib/supabase/` (browser + server clients, session refresh),
  `src/proxy.ts`, `.env.example`, `supabase/config.toml`, and a linked hosted project.
- **Migrations `0001`–`0009`, all applied.** All 13 tables live, RLS enabled on each, and all
  empty except the seeded `settings` row. `src/lib/supabase/types.ts` is **current** —
  regenerated 2026-08-13 against `0001`–`0009`, 916 lines, all 13 tables. It once sat at 296
  lines across two merges because nothing in the merge path runs `db:types`; **if it ever looks
  short again, that is the symptom.** The per-migration history is in `git log` and
  [docs/DATABASE.md](docs/DATABASE.md) — not restated here, because it rots.
- **`src/lib/list/`** — filter/sort/slice (`apply-list-view.ts`), the URL contract
  (`list-params.ts`), and the router hook (`use-list-params.ts`), consumed by all three list
  tables plus `src/components/ui/pagination.tsx`. **44 unit tests, and the only tests in the
  repo.** Shipped in PR #38.
- **`src/lib/validation/settings.ts`** — a Zod schema over the eight numeric `settings`
  columns, mirroring the CHECK constraints in `0003`/`0004`. Two of its choices are
  load-bearing, not incidental: the edit buffer stays a **string** until submit (parsing per
  keystroke eats a half-typed `2.`, putting the 2.5 cushion out of reach), and there are **no
  upper bounds**, because PRD §7A has not fixed sane ranges and a wrong ceiling is worse than
  none. **It validates a form, not a write** — no Server Action consumes it. Wiring the save
  path does not get to skip re-validating server-side.
- **`src/lib/config.ts`** (env parsing + constants), **`src/lib/fonts.ts`**, `src/lib/utils.ts`.
- **Tooling** — Prettier, Husky + lint-staged, ESLint with the `ui/` boundary and
  semantic-token rules, GitHub Actions CI.

### Not built

No `src/server/` and **no Server Action exists** — the app has no write path at all. No
`src/lib/pricing/`. No `e2e/`. An applied schema does not change this: any feature work starts
by creating the write path, not extending one.

### Delete-on-wiring

`src/lib/mock/` (fixtures) and `src/components/prototype/` (a client-side role switch that is
**not** authorization). Don't build on either; replace them.

### Blocked

Two open product decisions gate real work, and neither is a coding task
([docs/DATABASE.md](docs/DATABASE.md) §6):

- **The pricing formula and rounding rules (PRD §7A).** Nothing may infer a calculation order
  or which fields are canonical.
- **The fixed quote-line category list (PRD-007A).** The `categories` table ships empty.

**One go-live blocker:** do not wire the save RPC into a Server Action before PRD §7A is signed
off. That sign-off carries two obligations — confirm the pricing column list, **and** author
the guard that stops those columns being written directly over the Data API (DATABASE.md §5.1,
§6.1). The `profiles` role-self-escalation hole is **fixed** — `enforce_profile_role_change()`
in `0002`.

---

## 3. Non-negotiable invariants

Structural guarantees. Don't write code that breaks them.

1. **The approval gate is two triggers, not one — and not RLS.** Both exits from `Review`
   (→ `Approved`, → `Draft`) are admin-only inside Postgres via
   `validate_quote_status_transition`. An RLS `WITH CHECK` **cannot see the old row**, so it
   cannot express a transition at all. **Do not weaken the trigger assuming RLS is a second
   layer — it isn't.** `enforce_quote_created_in_draft` is its `BEFORE INSERT` half: without
   it a rep can `POST` a row already carrying `status = 'approved'` and defeat the gate without
   ever performing a transition. Neither backstops the other
   (`supabase/migrations/0007_quotes.sql`; the trap is DATABASE.md §6.2).
2. **Atomic multi-row save.** Quote (header + lines) and product (fab tiers + defaults + price
   history) writes go through a single Postgres RPC transaction. No client-side multi-step
   writes that can leave a row half-written.
3. **Server-side pricing trust boundary.** The Server Action recomputes the canonical cost
   breakdown from stored data at save time. Client numbers are UX only and are never persisted
   as the trusted value. **This one is a rule the code must follow, not a guarantee the
   database enforces** — RLS grants the row's owner table-wide UPDATE, so the ten value columns
   on `quotes` are writable directly over the Data API today. The guard is deferred to PRD §7A
   sign-off. Until then the boundary holds only as far as every write path honours it.
4. **Quote lifecycle:** Draft → Review → Approved → Sent, **plus Review → Draft** (request
   changes, PRD-010), and nothing else. Both exits from Review are admin-only. Every status
   change writes an audit row.
5. **Append, never overwrite.** Component cost changes append to `price_history`.

---

## 4. Stop and ask

### Off-limits — never touch without explicit human instruction

- **Secrets and env files** — `.env`, `.env.*`, anything holding a Supabase key.
  `.claude/settings.json` denies these for read _and_ write; that is the mechanical backstop,
  not a substitute for the rule. `.env.example` is deliberately readable. Consequence: Claude
  also cannot delete or rotate `.env.local`.
- **Database migrations** — never create, modify, or delete files under `supabase/migrations/`
  autonomously. **A migration present in `main` is applied and immutable.**
- **Auth-related code** — RLS policies, the transition triggers, JWT/role-claim handling,
  Supabase Auth wiring, session cookies (`@supabase/ssr`), `src/proxy.ts`.
- **CI/CD config** — `.github/workflows/` and Vercel settings.
- **Lock files** — `package-lock.json` is an `npm` side effect, not a direct edit.
- **Dependencies** — do not add or remove packages.

### Escalate — state the change and its reason, then wait for approval

- **Adding or removing a package** — name it, the reason, and the alternative rejected.
  [docs/TECH-STACK.md](docs/TECH-STACK.md) changes first, in its own PR.
- **Any schema or migration change** — tables, indexes, RLS policies, triggers, RPC functions,
  history tables.
- **Any change to the two-role (`rep`/`admin`) authorization model.**
- **Any change to how the `Review` exits are gated** — the single most costly mistake
  available in this repo.
- **The atomic-RPC contract** or **the server-side pricing trust boundary.**
- **Adopting an end-to-end test framework** — a TECH-STACK.md §5 decision first.
- **Editing anything in `docs/`, `CLAUDE.md`, or `CONTRIBUTING.md`** — a deliberate decision
  and a standalone PR, never folded into feature work (CONTRIBUTING.md, "Documentation
  changes"). This includes adding a design token.

### In bounds without asking

Implementing PRD-traced features inside an existing route group; writing Vitest tests; adding
Zod schemas; wiring Server Actions behind the existing authorization path; building screens
from `src/components/ui/` + the token layer.

When a task appears to need an out-of-bounds change, **flag it and propose it — never make it
silently.**

---

## 5. Building UI

Four steps, in order. Only the last two are plugin decisions.

**1. `/impeccable shape` first — required, not optional,** for a new route, screen, or
user-facing component. It plans UX, information architecture, and states _before_ any code
exists, and **writes no code** — which is precisely why it is allowed when the rest of
impeccable's generating commands are not. **Backend-only work is exempt:** a migration, a
Server Action, or a `src/lib/` module follows the `docs/` + PROJECT-STRUCTURE.md path instead.

- **It is an interview, not a one-shot** — a discovery round, 2–3 questions at a time. Budget
  for the conversation.
- **The output is a design brief you must explicitly confirm.** An unconfirmed brief is a
  failure by the skill's own gate. Put the confirmed brief in the PR or the issue.
- **Order against `superpowers:brainstorming`:** brainstorming settles _what_ and _why_;
  `shape` settles _what it looks like and how it behaves_. Requirement still open →
  brainstorming, then `shape`. Requirement already pinned by PRD.md — the normal case — → go
  straight to `shape`.
- **If `shape` ever routes you to `/impeccable teach`, stop.** That is its fallback when the
  context gate fails, and `teach` is forbidden here. The gate passes because `docs/PRODUCT.md`
  exists and `.claude/settings.json` pins `IMPECCABLE_CONTEXT_DIR=docs`. Being routed to
  `teach` means the context broke — fix the context, never run the command.
- **`/impeccable craft` is banned.** It is `shape` plus a build, and the build half is exactly
  what step 4 prohibits. The ban is about provenance: a screen assembled from
  `src/components/ui/` and the token layer is reviewable against the design system line by
  line; one generated wholesale is not.

**2. The design system decides how it looks — always.**
[docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) → the tokens in `src/app/globals.css` → the
`no-restricted-syntax` rule in `eslint.config.mjs`. Every color, font, radius, and type size
comes from there. **Never a hex literal, never a raw Tailwind color class (`bg-slate-100`),
never a Google Font.** Brand values are Archivo + IBM Plex Mono; colors come from the semantic
layer (`bg-background`, `text-muted-foreground`, …). Adding a token is a DESIGN-SYSTEM.md
change requiring approval. No plugin, skill, or CLI output authorizes one.

**3. shadcn/ui builds it.** [components.json](components.json) at the root (style
`radix-nova`, `cssVariables: true`), `shadcn@4` as a devDependency, and the 18 primitives in
`src/components/ui/` are shadcn components already adapted to our tokens.

- **Reuse before you add.** Check `src/components/ui/` first, then extend a primitive with a
  `cva` variant — see the `editable` variant in
  [src/components/ui/input.tsx](src/components/ui/input.tsx) — before pulling in a new one.
- **Adding a primitive:** `npx shadcn@latest add <name>`. Output is compatible by construction
  (shadcn names its tokens exactly as `globals.css` defines them), which is why generated
  components pass lint. Read the diff anyway — it needs our comment-the-why convention, and a
  hardcoded color in it is a bug, not a starting point.
- **`frontend-design@claude-plugins-official` is optional taste input** for a genuinely new
  screen. It picks no values. Skip it when editing an existing screen — which is most work here.

**4. `impeccable@impeccable` audits the result — it never writes it.** `/impeccable audit` and
`/impeccable critique` are the sanctioned entry points; `npx impeccable detect src/` is the
deterministic CLI check (exit `2` = findings, `--json` for tooling). **Never** `craft`,
`polish`, `teach`, or `document` — the last two write context files, and `document` writes a
`DESIGN.md` that would silently displace `docs/PRODUCT.md` as impeccable's context.

- **The baseline is clean, so treat any new finding as real.** `detect src/` returns zero
  findings — not luck: `eslint.config.mjs` already makes the raw palette classes its detectors
  key on unwritable. A finding means something got past lint.
- **Three rules are suppressed**, all verified false positives, all repo-wide (`ignoreRules`
  has no per-file scope). Rationale and the blind spot each creates are in the `$comment` of
  [.impeccable/config.json](.impeccable/config.json) — **read it before adding a fourth.**
  `npx impeccable detect <path> --no-config` shows what they hide. Suppress only via
  `npx impeccable ignores add-rule <rule>`, never by changing a token, and always report what
  you suppressed and why. Note `--reason` is silently dropped by `add-rule`, so the rationale
  goes in `$comment`. `--local` writes a gitignored per-developer file — never put a team
  decision there.
- **`em-dash-overuse` on `/quotes/new` is known, deliberate noise — do not suppress it.** It
  counts 40 `—` placeholder glyphs in table cells as prose cadence. It is `advisory: true`, so
  the route still exits 0.
- **Static scanning cannot check contrast, and that gap is real.** `low-contrast` and
  `gray-on-color` need two resolved colors; our semantic tokens resolve at runtime, so
  `detect src/` **skips** the WCAG AA question rather than answering it. To actually check:
  `npm run dev`, then `npx impeccable detect http://localhost:3000/<route>`. Nothing to
  install. Never add `puppeteer` to `package.json`, whatever impeccable's error message says.
- **Do not create `DESIGN.md`, rename DESIGN-SYSTEM.md to it, or add frontmatter to it**,
  without approval. The four `design-system-*` rules are inert by deliberate choice — a second
  machine-readable copy of the token values would drift, and ESLint enforces the same thing.

**Ship gate:** `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run test` —
the four CI runs. A suggestion that fails lint was never a valid suggestion.

---

## 6. Database and migrations

**Merge to `main` first, then `/db-migrate` applies it. Both steps are required.** The Supabase
GitHub integration was **disconnected on 2026-08-15**; until then it pushed on merge and this
section said the merge was the apply step. It is not any more. Four consequences:

1. **The PR review is still the only review.** Read the SQL _in the PR_. Moving the apply step
   after the merge did not move the review step with it — dev runs against a hosted project with
   no local stack, no `db reset`, and no automated backups on the Free tier, so a mistake that
   reaches `/db-migrate` has already passed the last gate that could have caught it cheaply.
2. **A merged migration sits unapplied until a human runs `/db-migrate`.** This is the new
   failure mode and the price of the change: `main` and the database disagree silently until
   someone notices. `/db-migrate` Phase 8 reports it, and
   [.github/workflows/db-drift.yml](.github/workflows/db-drift.yml) warns on it independently.
3. **`db:types` still has nothing else behind it.** `/db-migrate` runs it as part of the apply
   path now, but a schema that moved without its types leaves every `supabase-js` call lying
   about its shape. That is how `types.ts` once sat 620 lines stale across two merges.
4. **A migration is immutable the moment it merges**, not once someone applies it. A correction
   is a new file every time (`0004` → `0003`, `0009` → `0006`). `db push` compares recorded
   versions, not file contents, so editing a merged migration is skipped silently while reading
   as though it landed. **Run `git fetch` before editing any migration** — the guard hook reads
   `origin/main`, and a stale clone is its one false-allow.

**`/db-migrate` is the apply path.** Its file
([.claude/commands/db-migrate.md](.claude/commands/db-migrate.md)) is the authority on the
sequence. Phase 1 is a hard gate: it refuses to push anything not already on `origin/main` at
identical content, which is what keeps "merge first" a rule rather than a habit. Everything
after the push — `db:types`, the `relrowsecurity` check, the both-halves trigger check, the
blocking gate — runs in the same command. `0001`–`0009` were applied by the integration, which
wrote the same `supabase_migrations.schema_migrations` table the CLI reads, so the handoff needed
no repair. There is deliberately **no `npm run db:migrate`** wrapper.

**No local Supabase stack.** Docker is not installed. Never suggest `supabase start` or
`db reset` — see [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md) §4.

---

## 7. Commands and machine-enforced config

[`package.json`](package.json) is the authority on what scripts exist. **Do not invent one.**

- **Run clean:** `dev`, `build`, `start`, `lint`, `typecheck`, `format`, `format:check`.
- **`npm run test`** runs the 44 unit tests under `src/lib/list/`. `vitest.config.ts` sets no
  `passWithNoTests`, so an empty suite fails rather than passing silently — a green run means
  the tests actually ran.
- **`npm run db:push` / `db:types`** both run, and the project is linked. Since the integration
  was disconnected, `db:push` normally **does** have something pending after a migration merges
  (see §6) — but run `/db-migrate`, never the bare script: the script skips the merge gate, the
  destructive-SQL read, the dump, and every verification step. A failed `db:types` is safe: it
  generates to a gitignored
  `.tmp` and renames only on exit 0, so `types.ts` is left untouched. Re-run it once
  connected — never hand-edit `types.ts`.
- **There is no end-to-end suite, by decision.** No `test:e2e`, no `playwright.config.ts`, no
  `e2e/`, and `@playwright/test` is not a dependency — an installed runner that runs nothing
  implies coverage that does not exist (TECH-STACK.md §5). The specific assertions nobody
  makes are registered in ENGINEERING-RULES.md §3.
- **Slash commands:** `/db-migrate` (apply + verify, see §6) and `/doc-audit` (three-pass doc
  audit: `align` → `drift` → `absorb`; README.md documents the arguments). Run `/doc-audit`
  after landing a spec, after a migration merges, and after any `docs/` edit.

### Enforced by the harness, not by convention

`permissions` in [.claude/settings.json](.claude/settings.json) plus one `PreToolUse` hook,
[.claude/hooks/block-applied-migration.mjs](.claude/hooks/block-applied-migration.mjs). This is
a floor under the rules in §4, not a replacement for reading them.

- **Applied migrations are unwritable.** The hook denies `Write`/`Edit` on any
  `supabase/migrations/*.sql` present in `origin/main` or local `main`. A migration still on a
  feature branch stays editable — the normal case while under review. It **fails open** when
  git is unavailable.
- **`.env` and `.env*.local` are denied for read and write.** `.env.example` is readable.
- **`db push` in any spelling forces a prompt** — `ask`, not `deny`, because `deny` would break
  `/db-migrate` itself. **`git push *` also prompts.**
- **`supabase db reset` is denied outright.**
- Writing another hook: use the **shell form** (`"command": "node path/to.mjs"`). The exec form
  silently never fires here — indistinguishable from a hook that approved. Prove a new hook
  fires before trusting it.

---

## 8. Agent behavior and workflow

`CONTRIBUTING.md` owns branch naming, commit convention, the review flow, and the self-review
gate — read them there, they are not restated. These are the agent-specific constraints:

- **Branch creation is a human action** — never create one autonomously.
- **Never push to any remote branch** without explicit approval — including the branch you are
  on, not just `main`.
- **Never open, close, or comment on a Pull Request** without explicit instruction.
- **Plan before execute** — for any non-trivial task, show a plan and wait for approval.
- **One change at a time** when modifying existing files. Propose, explain why, wait. No silent
  batch edits.
- **Scope discipline** — touch only what was asked. Flag out-of-scope issues without acting.
- **No invented scope** — no features, refactors, error handling, or abstractions beyond the
  request.
- **Ask, don't assume.** Keep clarifying questions minimal and batched, not one at a time.
- **Uncertainty is explicit.** Never present a guess as a fact.
- **When blocked, stop and say so.** Name what is ambiguous, state the options, and wait. Do
  not guess, do not proceed on an assumption, and do not silently narrow the task.

---

## 9. Authority order

When two sources disagree, the higher one wins:

1. **The filesystem and `git`** — a document claiming a file exists loses to `ls`.
2. **`CONTRIBUTING.md`** for process, governance, and commands.
3. **`docs/` by lineage:** PRODUCT → PRD → ARCHITECTURE → TECH-STACK → ENGINEERING-RULES.
4. **This file**, for the Claude Code behavior rules it owns.
5. **`README.md` and `docs/BACKLOG.md`** — they restate; they own nothing.

---

## Engineering rules

@docs/ENGINEERING-RULES.md

The line above **imports** the project's coding conventions, banned patterns, and testing rules
into every session. They are not restated here. If one changes, edit
`docs/ENGINEERING-RULES.md`; never add a competing copy to this file.
