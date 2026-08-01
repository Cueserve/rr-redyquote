---
description: Push pending Supabase migrations to the linked project, regenerate types, and verify
allowed-tools: Bash, Read, Glob, Grep
---

Apply RedyQuote's pending `supabase/migrations/*.sql` to the **linked hosted project** and leave
the repo in a verified, type-synced state.

Development runs against a hosted Supabase project with no local Docker stack
([docs/ENVIRONMENTS.md](../../docs/ENVIRONMENTS.md) §1). There is no `db reset` to fall back on,
which is why the pre-flight below is not optional ceremony.

Arguments (optional): `$ARGUMENTS` — pass `dry-run` to stop after step 3 and report only.

## 1. Pre-flight — stop and report if any check fails

1. `git status --short supabase/migrations/` — list what is unstaged/untracked, and name every
   pending file. Never push a migration the user has not seen.
2. Confirm the project is linked: `supabase/.temp/project-ref` exists. If not, stop — the user
   must run `npx supabase link` themselves (it needs their credentials).
3. **Read every pending migration file before pushing it.** A migration is irreversible against a
   hosted database. Specifically flag, and stop for confirmation, if any contains:
   - `drop table`, `drop column`, `truncate`, `alter column ... type`, or `delete from`
   - a change to a file that has **already been pushed** — editing an applied migration is how
     the migration chain silently diverges from the remote. New change → new file.
4. If any destructive statement is present, `docs/PRD.md` NFR-006a requires a dump first:
   `npx supabase db dump --linked -f backup-<YYYYMMDD>.sql` — and that filename must not land in
   git.

## 2. Confirm before writing

State plainly: which files will apply, in what order, and that the target is the **hosted**
project (never assume it's disposable). Get a yes before step 3.

## 3. Dry run

```bash
npx supabase db push --linked --dry-run
```

Read the output. Two failures are common and mean different things:

- **Naming rejected** — the files use a `NNNN_` prefix ([docs/PROJECT-STRUCTURE.md](../../docs/PROJECT-STRUCTURE.md)
  §5), not the CLI's own 14-digit UTC timestamp. If the CLI refuses them, rename all files to a
  consistent scheme in one change rather than mixing the two, and update PROJECT-STRUCTURE §5 in
  the same commit so the doc stops being wrong.
- **Connection refused / project paused** — the Free plan pauses after a week idle
  ([ENVIRONMENTS.md](../../docs/ENVIRONMENTS.md) §3, rule 5). Tell the user to resume it in the
  dashboard; do not retry in a loop.

Stop here if `$ARGUMENTS` contains `dry-run`.

## 4. Push, then regenerate types

```bash
npx supabase db push --linked --yes
npm run db:types
```

`db:types` is not optional — TECH-STACK.md §4 makes `src/lib/supabase/types.ts` a generated
artifact, and a schema change without it leaves TypeScript lying about the database. Then run
`npm run typecheck` and report any new errors: a rename or dropped column surfaces here, and
that is the point.

If `db push` fails **partway**, say so explicitly and report which migrations applied. Do not
re-run it hoping for idempotence.

## 5. Verify the invariants the SQL cannot prove

For every table the pushed migrations created, confirm RLS is actually on — a table with policies
but `relrowsecurity = false` enforces nothing:

```sql
select relname, relrowsecurity from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r' order by relname;
```

Any `false` is a defect, not a nit. Report it.

Then check whatever the pushed migration specifically claims, e.g.:

- `settings` — a second `insert` is rejected by the singleton PK; a non-admin `update` affects 0 rows
- `profiles` — a rep cannot set `role = 'admin'` on their own row (the escalation guard)
- `quotes` — a non-admin cannot move `pending_approval → approved` **even owning the row**
  ([docs/DATABASE-SQL.md](../../docs/DATABASE-SQL.md) §4.5 calls this the single most important
  assertion in the repo)

Run these through `npx supabase db execute` if available in this CLI version; if not, print the
SQL and ask the user to run it in the dashboard SQL editor rather than skipping the step.

## 6. Report

- Migrations applied, in order
- Whether `types.ts` changed, and whether `typecheck` still passes
- RLS verification result per table
- Anything left undone, named explicitly

## Never

- Push to production. Only ever the linked dev project ([ENVIRONMENTS.md](../../docs/ENVIRONMENTS.md)
  §3, rule 1).
- Suggest `supabase start` or `db reset` — Docker is not installed on this machine.
- Read, print, or write `.env`, `.env*.local`, or anything holding the service-role key.
- Edit schema or RLS in the Supabase dashboard to work around a failed migration. Fix the
  migration file (ARCHITECTURE.md §5, TECH-STACK.md §6).
