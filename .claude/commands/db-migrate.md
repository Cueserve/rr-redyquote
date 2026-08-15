---
description: Verify the hosted Supabase schema matches supabase/migrations/, regenerate types.ts, and check the RLS and trigger invariants. Does NOT apply migrations — merging to main already did that.
allowed-tools: Read, Glob, Grep, Bash
argument-hint: "[check]"
---

# DB Migrate — verification, not application

Verify that RedyQuote's hosted Supabase schema matches `supabase/migrations/*.sql`, bring
`src/lib/supabase/types.ts` back in sync, and prove the invariants the SQL cannot prove about
itself.

**The name is a holdover.** It stays `/db-migrate` because renaming the file renames the
command and breaks every citation in `CLAUDE.md`, `README.md`, and `CONTRIBUTING.md`. Read the
heading, not the slug.

**This command no longer applies migrations, because merging already did.** The Supabase
GitHub integration pushes on merge to `main` — verified 2026-08-13: `0009` reported
`remote: ""` before its PR merged and `remote: "0009"` immediately after, with no `db push`
run by anyone. `0006`–`0008` landed the same way. An earlier version of this file described
itself as the apply path; it was wrong, and the mistake mattered because it put the review
step after the database had already changed.

**Three consequences, all load-bearing:**

1. **The gate is the pull request.** Development targets a hosted project with no local Docker
   stack and no `db reset` ([docs/ENVIRONMENTS.md](../../docs/ENVIRONMENTS.md) §1), and no
   automated backups on the Free tier (PRD NFR-006a). The SQL must be read **in review**, before
   merge. A pre-flight that runs afterwards protects nothing.
2. **`npm run db:types` is the step with no automation behind it.** The integration does not run
   it. That is exactly how `types.ts` sat 620 lines stale across two merges, knowing none of ten
   live tables. Running it, and committing the result, is this command's single most useful act.
3. **A migration is immutable at merge**, not at apply. A correction is always a new file —
   `0004` corrects `0003`, `0009` corrects `0006`.

**A schema or migration change requires explicit human approval before it is authored at all**
([CLAUDE.md](../../CLAUDE.md)), and `supabase/migrations/` is off-limits to autonomous edits.

Arguments (optional): `$ARGUMENTS` — pass `check` to stop after step 2 and report only.

---

## 1. Pre-flight

1. Confirm the project is linked: `supabase/.temp/project-ref` exists. If not, stop — the user
   must run `npx supabase link` themselves; it needs their credentials.
2. `git status --short supabase/migrations/` — anything unstaged or untracked here has **not**
   merged and therefore has **not** applied. Name it and say so.
3. `git fetch && git status -sb` — if the local branch is behind `origin/main`, the comparison in
   step 2 is against a stale clone. Pull first.

## 2. Compare local files against the remote

```bash
npx supabase migration list
```

Every row pairs a `local` version with a `remote` one. Read it carefully:

- **`local` and `remote` both set** — applied. Normal state after a merge.
- **`local` set, `remote` empty** — authored but not applied. If that file **is** on `main`, the
  integration did not run: report it and go to step 3. If it is **not** on `main`, that is
  correct and expected — it applies when its PR merges. Do not push it early.
- **`remote` set, `local` empty** — a migration exists on the database with no file behind it.
  Stop and report. Someone edited schema in the dashboard, which
  [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) §5 prohibits, or a file was deleted.

Stop here if `$ARGUMENTS` contains `check`.

## 3. Fallback push — only when the integration did not run

Skip this entirely in the normal case. Reach it only when step 2 found a migration that is on
`main` and still unapplied.

**Read every such file before pushing it.** Stop and get confirmation if any contains
`drop table`, `drop column`, `truncate`, `alter column ... type`, `delete from`, or a change to
RLS or to a lifecycle trigger. Name the table, the policy or trigger, and what the change permits
that it did not before — RedyQuote's approval gate is a database guarantee
([docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) §1), and a weakened trigger lets a rep
approve their own quote.

If anything destructive is present, dump first:

```bash
npx supabase db dump --linked -f backup-<YYYYMMDD>.sql
```

That filename MUST NOT land in git. Confirm it is ignored or removed before any commit.

Then dry-run, and only then push:

```bash
npx supabase db push --linked --dry-run
npx supabase db push --linked --yes
```

Common failures: **connection refused / project paused** — a Free-plan project pauses after a
week idle ([docs/ENVIRONMENTS.md](../../docs/ENVIRONMENTS.md) §3); the user resumes it in the
dashboard, do not retry in a loop. If `db push` fails **partway**, say which migrations applied
and stop. Do not re-run hoping for idempotence.

## 4. Regenerate types — the step nothing else does

```bash
npm run db:types
```

Not optional. [docs/TECH-STACK.md](../../docs/TECH-STACK.md) §4 makes
`src/lib/supabase/types.ts` a generated artifact in a no-ORM stack, so a schema that moved
without its types leaves every `supabase-js` call lying about its shape. A failed run is safe —
the script generates to `types.ts.tmp` and renames only on exit 0 — so re-run it once connected
rather than hand-editing.

Report whether the file changed. **If a migration merged and this produces no diff, something is
wrong** — say so rather than assuming it was already current.

## 5. Verify the invariants the SQL cannot prove

RLS on every table — a table with policies but `relrowsecurity = false` enforces nothing:

```sql
select relname, relrowsecurity,
       (select count(*) from pg_policies p
         where p.tablename = c.relname and p.schemaname = 'public') as policies
from pg_class c
where relnamespace = 'public'::regnamespace and relkind = 'r'
order by relname;
```

Any `false` is a defect, not a nit. Expect **zero policies on `quote_number_sequences`** — that
is deliberate and must stay that way; it is why `fn_next_quote_number()` is `SECURITY DEFINER`.

Then the triggers, because a dropped one is silent:

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

Then whatever the merged migration specifically claims, e.g. a new column's type and nullability
via `information_schema.columns`.

Run these through **`npx supabase db query --linked "<sql>"`**. It is `db query`, **not**
`db execute`: the latter does not exist, and the CLI answers an unknown subcommand by printing
help and exiting **0**, so a naive probe reports success. Add `--output json` for parseable rows.
If the subcommand is ever missing, print the SQL and ask the user to run it in the dashboard SQL
editor rather than skipping the step.

**What cannot be checked here, and must not be faked:** whether a non-admin is actually rejected
when moving a quote out of `Review`, and the five sibling assertions. Those need a real Postgres
session as a specific role. They are recorded as a standing gap in
[docs/ENGINEERING-RULES.md](../../docs/ENGINEERING-RULES.md) §3, "Known gap". Reading the trigger
source is not evidence it fires.

## 6. Gate

```bash
npm run lint && npm run typecheck && npm run format:check && npm run test
```

A type regeneration that breaks the type-check is the whole reason this step exists: a rename or
a dropped column surfaces here.

## 7. Report — do not commit or push to a remote

- Migration versions: local vs remote, and any mismatch
- Whether the fallback push was needed (normally: no)
- Whether `types.ts` changed
- RLS result per table, and the trigger check
- Gate result
- Anything left undone, named explicitly

**Do not commit, and do not push to any remote.** Both are human actions
([CLAUDE.md](../../CLAUDE.md), "Workflow"). A regenerated `types.ts` normally wants its own
`chore(db):` commit — state the suggested message and stop.

## Never

- Push to production. Only ever the linked development project
  ([docs/ENVIRONMENTS.md](../../docs/ENVIRONMENTS.md) §3).
- Suggest `supabase start` or `db reset` — Docker is not installed on this machine
  ([docs/ENVIRONMENTS.md](../../docs/ENVIRONMENTS.md) §1).
- Read, print, or write `.env`, `.env*.local`, or anything holding the service-role key.
- Edit schema or RLS in the Supabase dashboard to work around a failed migration. Fix it in a new
  migration file ([docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) §5).
- Treat this command as a review. It runs after the database changed; the pull request is the
  review.
