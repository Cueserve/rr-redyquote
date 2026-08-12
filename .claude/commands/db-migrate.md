---
description: Push pending Supabase migrations to the linked project, regenerate types, and verify
allowed-tools: Bash, Read, Glob, Grep
---

# DB Migrate

Apply RedyQuote's pending `supabase/migrations/*.sql` to the **linked hosted Supabase
project** and leave the repo in a verified, type-synced state.

Development runs against a hosted Supabase project with no local Docker stack
([docs/ENVIRONMENTS.md](../../docs/ENVIRONMENTS.md) §1). There is no local stack to
`db reset`, so every push is irreversible against real data and the pre-flight below is not
optional ceremony.

Migrations are applied **after** merging to `main`, never before
([docs/ENVIRONMENTS.md](../../docs/ENVIRONMENTS.md), "Migration ordering"). If the migration you
are about to push is not yet on `main`, stop and say so.

**A schema or migration change requires explicit human approval before it is authored at all**
([CLAUDE.md](../../CLAUDE.md)), and `supabase/migrations/` is off-limits to autonomous edits.
This command applies migrations a human has already approved — it is not a license to write them.

Arguments (optional): `$ARGUMENTS` — pass `dry-run` to stop after step 3 and report only.

---

## 1. Pre-flight — stop and report if any check fails

1. `git status --short supabase/migrations/` — list what is unstaged/untracked, and name every
   pending file. Never push a migration the user has not seen.
2. Confirm the project is linked: `supabase/.temp/project-ref` exists. If not, stop — the user
   must run `npx supabase link` themselves (it needs their credentials, and credentials are
   out of scope for this command).
3. **Read every pending migration file before pushing it.** A migration is irreversible against a
   hosted database. Specifically flag, and stop for confirmation, if any contains:
   - `drop table`, `drop column`, `truncate`, `alter column ... type`, or `delete from`
   - a change to a file already present in `origin/main` — the `block-applied-migration` hook
     denies that edit for a reason; if one reached the working tree anyway, treat it as a
     divergence and stop. New change → new file.
   - **an RLS policy change.** RedyQuote's approval gate is a database guarantee
     ([docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) §1); a weakened policy or trigger
     lets a rep approve their own quote. Name the policy, the table, and what the
     change permits that it did not before.
4. If any destructive statement is present, take a dump first:

   ```bash
   npx supabase db dump --linked -f backup-<YYYYMMDD>.sql
   ```

   That filename MUST NOT land in git. Confirm it is ignored or removed before any commit.

## 2. Confirm before writing

State plainly: which files will apply, in what order, and that the target is the **hosted**
project (never assume it is disposable). Get an explicit yes before step 3.

## 3. Dry run

```bash
npx supabase db push --linked --dry-run
```

Read the output. Common failures and what they mean:

- **Naming rejected** — the files use an `NNNN_` prefix
  ([docs/PROJECT-STRUCTURE.md](../../docs/PROJECT-STRUCTURE.md) §5), not the CLI's own 14-digit
  UTC timestamp. If the CLI refuses them, rename all files to one consistent scheme in a single
  change rather than mixing the two, and update PROJECT-STRUCTURE §5 in the same commit so the
  doc stops being wrong.
- **Connection refused / project paused** — a Free-plan project pauses after a week idle
  ([docs/ENVIRONMENTS.md](../../docs/ENVIRONMENTS.md) §3). Tell the user to resume it in the
  dashboard; do not retry in a loop.

Stop here if `$ARGUMENTS` contains `dry-run`.

## 4. Push, then regenerate types

```bash
npx supabase db push --linked --yes
npm run db:types
```

`db:types` is not optional — [docs/TECH-STACK.md](../../docs/TECH-STACK.md) §4 makes
`src/lib/supabase/types.ts` a generated artifact in a no-ORM stack, and a schema that moved
without its types leaves every `supabase-js` call lying about its shape. Then run
`npm run typecheck` and report any new errors: a rename or a dropped column surfaces here, and
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

- `settings` — a second `insert` is rejected by the singleton PK; a non-admin `update`
  affects 0 rows
- `profiles` — a rep cannot set `role = 'admin'` on their own row (the escalation guard)
- `quotes` — a non-admin cannot move `pending_approval → approved` **even owning the row**
  ([docs/DATABASE-SQL.md](../../docs/DATABASE-SQL.md) §4.5 calls this the single most
  important assertion in the repo)

Run these through **`npx supabase db query --linked "<sql>"`**. It is `db query`, **not**
`db execute`: the latter does not exist, and the CLI answers an unknown subcommand by printing
help and exiting **0** — so a naive `--help` probe reports success. If the subcommand is ever
missing, print the SQL and ask the user to run it in the dashboard SQL editor rather than
skipping the step. Add `--output json` for parseable rows.

Then run the blocking gate: `npm run lint`, `npm run typecheck`, `npm run format:check`,
`npm run test`. A type regeneration that breaks the type-check is the whole reason this step
exists.

## 6. Report — do not commit or push

- Migrations applied, in order
- Extensions and policies touched
- Whether `types.ts` changed, and whether `typecheck` still passes
- RLS verification result per table
- Anything left undone, named explicitly

**Do not commit, and do not push to any remote.** Both are human actions
([CLAUDE.md](../../CLAUDE.md), "Workflow"). State the suggested Conventional Commit message and
stop.

## Never

- Push to production. Only ever the linked development project
  ([docs/ENVIRONMENTS.md](../../docs/ENVIRONMENTS.md) §3).
- Suggest `supabase start` or `db reset` — Docker is not installed on this machine
  ([docs/ENVIRONMENTS.md](../../docs/ENVIRONMENTS.md) §1).
- Read, print, or write `.env`, `.env*.local`, or anything holding the service-role key.
- Edit schema or RLS in the Supabase dashboard to work around a failed migration. Fix the
  migration file ([docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) §5,
  [docs/TECH-STACK.md](../../docs/TECH-STACK.md)).
