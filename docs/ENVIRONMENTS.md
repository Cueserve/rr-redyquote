# ENVIRONMENTS.md — Where the Database Runs

**Owner:** Viral Parikh
**Last updated:** 2026-07-26
**Source of truth for:** which Supabase environment development runs against, the working
rules that follow from that, and the plan for adopting the local Docker stack later.

> Derived from: docs/TECH-STACK.md, docs/ARCHITECTURE.md
> Downstream: README.md (Prerequisites, Install & Run)

---

## 1. Current State — Hosted Only, No Docker

Development runs against a **hosted Supabase project**. The local Docker-based stack
(`supabase start`) is **deliberately deferred** — see [§4](#4-plan-adopting-the-local-docker-stack).

|                        | Today                                                          |
| ---------------------- | -------------------------------------------------------------- |
| Dev database           | Hosted Supabase project (Free plan), `redyquote-dev`           |
| Local stack            | Not used — Docker is not installed on the dev machine          |
| Migrations applied via | `supabase db push` against the linked remote                   |
| Types generated via    | `supabase gen types typescript --linked`                       |
| Prerequisite           | A Supabase account — **required now**, not just at deploy time |

**Why:** one developer, no Docker present, and the fastest path to a working quote flow.
The trade accepted: no offline development, no free `db reset`, and schema mistakes land on a
real remote database instead of a disposable container.

## 2. Plans & Cost

**Decision (2026-07-26): Free tier only for now. PITR is not adopted for v1.** NFR-006 was
amended to a phased requirement — see PRD.md NFR-006 and TECH-STACK.md §6.

| Plan        | Price                         | Decision                                                                                                                                                                     |
| ----------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Free**    | $0                            | **In use now.** Pauses after **1 week of inactivity** (resume from the dashboard); limit of 2 active free projects per org. **No automated backups at all.**                 |
| Pro         | $25/mo                        | **Required at production cutover** — the trigger is the first real customer quote being stored. Includes daily backups, 7-day retention. Also removes auto-pause.            |
| PITR add-on | +$100/mo per 7 days retention | **Declined for v1.** Replaces daily backups with finer granularity and additionally requires a Small compute add-on. Revisit only if a stated RPO ever drops below 24 hours. |

### What Free actually costs you

Free has **no automated backups** — this is stronger than "no PITR." Supabase's own guidance
for Free projects is to self-manage exports. While on Free, the only recovery mechanism is the
one you run yourself:

```bash
npx supabase db dump --linked -f backup-$(date +%Y%m%d).sql   # before destructive migrations
```

This is acceptable **because the database holds seed and test data only**. The moment real
quotes exist, the exposure changes from "re-run the seed script" to "un-recreatable business
data with no recovery path" — which is what NFR-006b's Pro trigger exists to prevent. Do not
let that trigger pass silently.

## 3. Working Rules While Hosted-Only

These matter more without a local stack, because there is no disposable database to catch
mistakes:

**First, in every fresh clone: link it.** The CLI stores the link in `supabase/.temp/`, which is
gitignored — correctly, but it means a new clone of this repo is **not** linked, even though
`.env.local` may already be in place and `npm run dev` works fine. Nothing warns you; the only
symptom is `LegacyProjectNotLinkedError: Cannot find project ref` from `db push`, `db:types`,
`migration list`, and `projects list` alike. Fix it once per clone:

```bash
npx supabase link --project-ref ypoqkaoasorncpdadllg   # the RedyQuote project
```

Let it prompt for the database password rather than passing `-p` — the flag works, but the
password then lands in shell history. The ref is not a secret; it is the subdomain of the
`NEXT_PUBLIC_SUPABASE_URL` that ships to every browser. Verify with
`npx supabase migration list --linked`, which prints a LOCAL and a REMOTE column — a migration
present in LOCAL but blank in REMOTE has not been applied.

1. **Two projects, never one.** `redyquote-dev` and `redyquote-prod` are separate Supabase
   projects. Never point a dev branch at the production project — without a local stack, the
   dev project _is_ your sandbox.
2. **Schema changes are still migrations only.** `supabase/migrations/*.sql`, applied with
   `supabase db push`. Hand-editing schema or RLS in the dashboard stays prohibited
   (TECH-STACK §6) — and now it's worse, because there's no `db reset` to reconcile drift.
3. **Regenerate types after every push:** `npm run db:types`. It pipes
   `npx supabase gen types typescript --linked` into `src/lib/supabase/types.ts`, then runs
   `prettier --write --end-of-line crlf` over it. Both details are load-bearing: `npx` because
   a bare `supabase` is not on PATH, and the explicit `crlf` because `.prettierrc` sets
   `endOfLine: "auto"`, so Prettier would otherwise keep the generator's LF endings and leave
   the file permanently dirty in `git status` with an empty diff.
   **Still true of this script:** the `>` truncates `types.ts` before the generator runs, so a
   failed generation leaves it empty and `npm run typecheck` fails until you regenerate or
   `git checkout` it. The CLI has no `--output-file` flag to avoid this.
4. **`.env.local` holds the dev project's URL + anon key only.** Never the service-role key —
   none is used anywhere in this app (ARCHITECTURE §1). `.env*` is gitignored; `.env.example`
   documents the variable names with placeholder values.
5. **Expect the pause.** If the dev project has been idle a week, the first `db push` or app
   request fails until you resume it in the dashboard. That's the Free plan working as designed,
   not a bug to debug.

## 4. Plan: Adopting the Local Docker Stack

**Trigger — do this at whichever comes first:**

- Onboarding developer #2 (a shared remote dev database stops working the moment two people
  run conflicting migrations), or
- The first migration you'd want to rehearse destructively before pushing, or
- The first time CI needs a database to run E2E tests against.

### Prerequisites

- Docker Desktop for Windows (WSL2 backend), ~4 GB RAM free
- Ports 54321–54324 unused (`supabase start` binds API, DB, Studio, Inbucket)

### Steps

| #   | Step                                                                               | Command / Action                                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Install Docker Desktop, confirm the daemon runs                                    | `docker info` returns a server version                                                                                                                                       |
| 2   | Start the local stack (`supabase/config.toml` already exists from `supabase init`) | `npx supabase start` — prints the local API URL, anon key, and DB URL                                                                                                        |
| 3   | Point the app at local                                                             | Set the Supabase URL/anon key in `.env.local` to the values step 2 printed; keep the remote values in a commented block                                                      |
| 4   | **Replay every migration from empty**                                              | `npx supabase db reset` — this is the payoff: it proves the migration chain builds a correct schema from scratch, which `db push` against a long-lived remote never verifies |
| 5   | Regenerate types from local                                                        | `npx supabase gen types typescript --local > src/lib/supabase/types.ts`                                                                                                      |
| 6   | Verify the app end to end                                                          | `npm run dev`, sign in, create → submit → approve a quote                                                                                                                    |
| 7   | Verify the gate under test                                                         | `npm run test:e2e` (Playwright, including the RLS approval gate)                                                                                                             |
| 8   | Update the docs in the same change                                                 | This file's §1, README Prerequisites + Install & Run, and TECH-STACK §6 if the workflow changes                                                                              |

**Expected friction at step 4.** If `db reset` fails while the remote works, the migration
chain is not replayable — usually a migration that assumed state created by hand, or ordering
that only worked incrementally. Fixing that is the point of adopting local, not a setback.

**Rollback:** `npx supabase stop` and restore the remote values in `.env.local`. Nothing in the
application code is environment-specific — the Supabase client reads URL and key from env
(`src/lib/config.ts`), so switching environments is a `.env.local` edit and a dev-server
restart.

**What changes for the team afterwards:** each developer runs their own local stack; the shared
hosted `redyquote-dev` project becomes the staging target rather than the working database, and
`db push` runs only when promoting a verified migration.

## 5. Keeping This File Honest

- When the local stack is adopted, rewrite §1 to describe the new normal and move the
  hosted-only rules in §3 into whatever still applies to staging.
- **The Pro upgrade trigger (NFR-006b) is the one thing in this file that must not be missed.**
  It fires on the first real customer quote, which is a product event, not an infrastructure
  one — nobody gets a reminder. Check it at production cutover.
- Editing this file is a deliberate decision, like any `docs/` change (CLAUDE.md).
