---
description: Apply migrations that are already merged to main to the linked Supabase project, regenerate types.ts, and verify the RLS and trigger invariants
allowed-tools: Bash, Read, Glob, Grep
argument-hint: "[check|prod]"
---

# DB Migrate

Apply RedyQuote's pending `supabase/migrations/*.sql` to the **linked** Supabase project,
bring `src/lib/supabase/types.ts` back in sync, and prove the invariants the SQL cannot prove
about itself.

**The GitHub integration's "Deploy to production" was switched off on 2026-08-15. This command
is the apply path again.** Until then the integration applied on merge to `main` and this file
was verification only. It no longer applies anything, so **a merged migration now sits unapplied
until a human runs this command.**

That gap is real and is the single most likely way `main` and the database drift apart — Phase 8
reports it explicitly, and [.github/workflows/db-drift.yml](../../.github/workflows/db-drift.yml)
posts a warning when a migration merges. **Neither is a schedule**: there is no nightly check, so
a migration you merge and then forget about is caught by nothing until someone looks.

The integration itself stays connected — only auto-apply is off. Nothing was lost by switching
it: preview databases per pull request need branching, branching needs the Pro plan, and this
project is on Free, so the `Supabase Preview` check has always reported `skipping`. If the
project ever moves to Pro, preview branches become a toggle rather than a reconnect.

**This command applies. It does not review, and it does not decide.** A schema or migration
change requires explicit human approval before it is authored at all
([CLAUDE.md](../../CLAUDE.md) §4), and `supabase/migrations/` is off-limits to autonomous edits.

**Nothing is pushed until it is on `origin/main`.** Phase 1 is a hard gate, not a warning. A
migration still on a branch has nothing to do here. This closes the drift case where someone
pushes from a branch that is later rebased, renamed, or abandoned, leaving the database holding
a version whose file exists nowhere on `main`.

**The pull request is still the review.** Development targets a hosted project with no local
stack, no `db reset`, and no automated backups on the Free tier (PRD NFR-006a). The SQL must be
read in review, before merge. Moving the apply step after the merge does not move the review
step with it.

Arguments (optional): `$ARGUMENTS` —

- `check` — stop after Phase 3 step 1 and report. Applies nothing, dumps nothing.
- `prod` — required to target a ref labelled `prod` in `supabase/.project-refs.json`. Without
  it, a non-`dev` ref aborts. There is no prod project today; this exists so that adding one
  later changes nothing about this command's safety.

Every phase below is a stop point. A failed check ends the run and reports — it never
downgrades to a warning and continues.

---

## Phase 0 — Environment identity guard

1. Confirm this is a git repo; record the current branch.
2. Confirm the Supabase CLI is reachable and a project is linked — `supabase/.temp/project-ref`
   exists. If not, stop: the user runs `npx supabase link` themselves; it needs their
   credentials.
3. Read the ref from `supabase/.temp/project-ref`.
4. Read `supabase/.project-refs.json` and look the ref up. **A ref that is not in that file is
   an abort.** Fail closed — `.temp/` is gitignored and `supabase link` rewrites it silently, so
   the linked ref is local mutable state and cannot be trusted on its own.
5. Resolve the label. If it is not `dev`, abort unless `$ARGUMENTS` contains a matching target
   (`prod`). Prod is never the default; it is reachable only by naming it.

State the ref, its label, and its name before going further.

## Phase 1 — Merge gate (hard stop)

1. `git fetch origin main`. **If the fetch fails, abort.** A stale `origin/main` makes every
   check below pass for the wrong reason — it is the same false-allow that
   [.claude/hooks/block-applied-migration.mjs](../hooks/block-applied-migration.mjs) has.
2. Set **A** = `supabase/migrations/*.sql` on disk.
3. Set **B** = `git ls-tree -r origin/main --name-only -- supabase/migrations/`.
4. Collect blockers, each named with its file and its reason:
   - **untracked** — on disk, unknown to git
   - **staged-not-committed** / **modified** — from `git status --porcelain -- supabase/migrations/`
   - **committed-not-merged** — in A and tracked, absent from B
   - **content-drift** — in both A and B but differing (`git diff origin/main -- supabase/migrations/`).
     Treat this as serious: `db push` compares recorded versions, not file contents, so an
     edited-after-merge migration is skipped silently while reading as though it landed
     ([CLAUDE.md](../../CLAUDE.md) §6).
   - **deleted-locally** — in B, missing from A. A migration history rewrite, not a cleanup.
5. **Any blocker ends the run.** Print the file/reason list and the remedy — commit, open the
   PR, merge to `main`, re-run. No push, no dump, no partial work. Exit non-zero.
6. Clean: state "N migration files, all present in `origin/main` at identical content."

## Phase 2 — Determine what is pending

```bash
npx supabase migration list --linked
```

Read each row:

- **`local` and `remote` both set** — applied. Normal.
- **`local` set, `remote` empty** — pending. This is the set to apply. Since auto-apply was
  switched off this is the expected state after any migration merges.
- **`remote` set, `local` empty** — a version on the database with no file behind it. **Report
  it and require acknowledgement before continuing.** Phase 1 prevents this going forward but
  cannot fix it retroactively; it means a dashboard edit (prohibited by
  [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) §5) or a deleted file. Never run
  `migration repair` to make it quiet. `0001`–`0009` were applied by the integration, which
  wrote the same `supabase_migrations.schema_migrations` table the CLI reads, so the handoff
  needs no repair — if this row type appears anyway, stop and look.

If nothing is pending: regenerate types (Phase 6 step 2), run the gate (Phase 7), report
"nothing to apply", and stop. The type regeneration still matters — it is the one step no other
part of the workflow performs, and it is exactly how `types.ts` sat 620 lines stale across two
merges, knowing none of ten live tables.

Flag out-of-sequence work: the files use an `NNNN_` prefix, not the CLI's 14-digit UTC
timestamp, so a pending number lower than the highest already-applied one is a real ordering
problem. The push will still run it; say so rather than letting it pass.

## Phase 3 — Classify, then back up

1. **Read every pending file.** Classify each as destructive, RLS-affecting, a data migration,
   or additive-only. Destructive means `drop table`, `drop column`, `truncate`, `delete from`,
   `alter column ... type`, `set not null` on an existing column, `drop policy`, `drop trigger`,
   or a rename.

   Name RLS **and trigger** changes specifically. RedyQuote's approval gate is a database
   guarantee enforced by triggers, and RLS is not a second layer behind them — a `WITH CHECK`
   cannot see the old row, so it cannot express a transition at all
   ([CLAUDE.md](../../CLAUDE.md) §3.1). A weakened trigger lets a rep approve their own quote.
   Say which trigger or policy, which table, and what the change permits that it did not before.

   **Stop here if `$ARGUMENTS` contains `check`.**

2. If anything is destructive, dump first. There are **no automated backups on the Free tier**,
   so this dump is the only recovery path that exists:

   ```bash
   npx supabase db dump --linked -f backup-<YYYYMMDD>.sql
   ```

   Add a `--data-only` dump for the affected tables when data — not just structure — is
   destroyed. **That filename MUST NOT land in git.** Confirm it is ignored or removed before
   any commit.

3. State plainly which files will apply, in what order, the classification of each, and the
   dump path if one was taken. Get an explicit yes. On a `dev` label a plain confirmation is
   enough; on `prod`, require the user to type the ref back.

## Phase 4 — Dry run

```bash
npx supabase db push --linked --dry-run
```

Compare the file list it reports against the pending set from Phase 2. **A mismatch means the
remote changed underneath you — abort and re-run from Phase 2.**

**Connection refused / project paused** — a Free-plan project pauses after a week idle
([docs/ENVIRONMENTS.md](../../docs/ENVIRONMENTS.md) §3). The user resumes it in the dashboard.
Do not retry in a loop.

## Phase 5 — Apply

```bash
npx supabase db push --linked --yes
```

`.claude/settings.json` sets `db push` to `ask` rather than `deny` precisely so this step can
run — expect the prompt, and do not try to route around it.

If it fails **partway**: stop. Report the exact error, re-run `npx supabase migration list
--linked` to show which migrations landed and which did not, and point at the dump path. Do not
re-run hoping for idempotence, and do not run `migration repair`.

## Phase 6 — Verify what the SQL cannot prove about itself

1. `npx supabase migration list --linked` — every pending version now applied, no drift left.

2. Regenerate types:

   ```bash
   npm run db:types
   ```

   Not optional. [docs/TECH-STACK.md](../../docs/TECH-STACK.md) §4 makes
   `src/lib/supabase/types.ts` a generated artifact in a no-ORM stack, so a schema that moved
   without its types leaves every `supabase-js` call lying about its shape. A failed run is
   safe — the script writes a gitignored `.tmp` and renames only on exit 0 — so re-run it once
   connected rather than hand-editing. **If a migration applied and this produces no diff,
   something is wrong.** Say so instead of assuming the file was already current. The file was
   916 lines across 13 tables at its last known-good regeneration; if it ever looks short again,
   that is the symptom.

3. RLS is actually on. A table with policies but `relrowsecurity = false` enforces nothing:

   ```sql
   select c.relname, c.relrowsecurity,
          (select count(*) from pg_policies p
            where p.tablename = c.relname and p.schemaname = 'public') as policies
   from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
   order by c.relname;
   ```

   Any `false` is a defect, not a nit. **Expect zero policies on `quote_number_sequences`** —
   that is deliberate and must stay that way; it is why `fn_next_quote_number()` is
   `SECURITY DEFINER`. A "fix" here by someone chasing a permission-denied error is a
   regression.

   RedyQuote is **single-tenant by design** (ARCHITECTURE.md §4) and `tenant_id` is a banned
   pattern ([docs/ENGINEERING-RULES.md](../../docs/ENGINEERING-RULES.md) §2). There is no
   tenancy predicate to check for, and a migration that introduces one is a finding.

4. The triggers, because a dropped one is silent:

   ```sql
   select c.relname as tbl, t.tgname, t.tgenabled
   from pg_trigger t join pg_class c on c.oid = t.tgrelid
   where not t.tgisinternal and c.relnamespace = 'public'::regnamespace
   order by c.relname, t.tgname;
   ```

   `quotes` must carry **both** halves of the approval gate — `quotes_enforce_created_in_draft`
   (`BEFORE INSERT`) and `quotes_validate_status_transition` (`BEFORE UPDATE`) — each with
   `tgenabled = 'O'`. Neither backstops the other and RLS backstops neither
   ([docs/DATABASE.md](../../docs/DATABASE.md) §5.5). `profiles` must carry
   `profiles_guard_role_change`.

5. Grants on new tables — no unintended `anon` or `authenticated` grant. Note the ten value
   columns on `quotes` are already writable directly over the Data API and the guard is deferred
   to PRD §7A sign-off ([CLAUDE.md](../../CLAUDE.md) §3.3); do not report that as new.

6. Whatever the applied migration specifically claims — a new column's type and nullability via
   `information_schema.columns`, a new constraint via `pg_constraint`.

Run these through **`npx supabase db query --linked "<sql>"`**. It is `db query`, **not**
`db execute`: the latter does not exist, and the CLI answers an unknown subcommand by printing
help and exiting **0**, so a naive probe reports success. Add `--output json` for parseable
rows. If the subcommand is ever missing, print the SQL and ask the user to run it in the
dashboard SQL editor rather than skipping the step.

**What cannot be checked here, and must not be faked:** whether a non-admin is actually rejected
when moving a quote out of `Review`, and the five sibling assertions. Those need a real Postgres
session as a specific role and are recorded as a standing gap in
[docs/ENGINEERING-RULES.md](../../docs/ENGINEERING-RULES.md) §3, "Known gap". Reading the
trigger source is not evidence it fires.

## Phase 7 — Gate

```bash
npm run lint && npm run typecheck && npm run format:check && npm run test
```

A type regeneration that breaks the type-check is the whole reason this step exists: a rename
or a dropped column surfaces here. `vitest.config.ts` sets no `passWithNoTests`, so a green
`test` means the 44 tests actually ran.

## Phase 8 — Report — do not commit or push

- The ref, its label, and the branch
- Migrations applied, in order
- Policies and triggers touched
- Whether `types.ts` changed, and whether `typecheck` still passes
- RLS, trigger, and grants result per table
- Dump path, if one was taken
- Gate result
- **Any version still present on `main` and unapplied on the remote** — call this out on its own,
  not as a footnote. With auto-apply switched off, nothing applies migrations automatically; a
  merge that nobody follows up on leaves `main` and the database disagreeing.
  This line and the merge-time warning from `db-drift.yml` are the only two places that surfaces,
  and neither runs on a schedule — so state it every run, even when the answer is "none".
- Anything left undone, named explicitly

**Do not commit, and do not push to any remote.** Both are human actions
([CLAUDE.md](../../CLAUDE.md) §8). A regenerated `types.ts` wants its own `chore(db):` commit —
state the suggested message and stop.

## Never

- Push to a project whose ref is absent from `supabase/.project-refs.json`, or to a `prod`-labelled
  ref without the `prod` argument.
- Push a migration that is not on `origin/main`. Phase 1 is the gate; there is no override.
- Suggest `supabase start` or `db reset` **on this machine** — Docker is not installed
  ([docs/ENVIRONMENTS.md](../../docs/ENVIRONMENTS.md) §4), and `db reset` is denied outright.
  CI is the exception and needs no suggesting:
  [.github/workflows/db-replay.yml](../../.github/workflows/db-replay.yml) already runs both on
  a runner for every pull request that touches a migration.
- Read, print, or write `.env`, `.env*.local`, or anything holding the service-role key.
- Edit schema or RLS in the Supabase dashboard to work around a failed migration. Fix it in a
  new migration file ([docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) §5).
- Run `migration repair` to silence a mismatch. A mismatch is a finding, not noise.
- Treat this command as the review. It runs after the merge; the pull request is the review.
