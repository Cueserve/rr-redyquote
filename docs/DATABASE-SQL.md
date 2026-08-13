# DATABASE-SQL.md — Schema, RPCs, and RLS

**Owner:** Viral Parikh
**Status:** **Fully transcribed — pending deletion.** See
[Transcription status](#transcription-status) and [Deleting this file](#deleting-this-file).
**Last updated:** 2026-08-13
**Authority:** **None any more.** The migration files are the schema (ARCHITECTURE.md §5).

> **This file no longer contains SQL.** As of 2026-08-13 every block it carried has been
> authored as a migration, and holding a second copy of applied DDL is precisely the drift
> ARCHITECTURE.md §5 exists to prevent. What remains is a signpost: where each section went,
> where the three pieces of prose that had no migration went, and the checklist for removing
> this file entirely.
>
> It survives one more change cycle only so the citations pointing at it — from
> ARCHITECTURE.md, TECH-STACK.md, PROJECT-STRUCTURE.md, README.md, two slash commands, two
> source files, and the headers of `0001`–`0003`, which are applied and immutable — do not
> dangle mid-review. Fixing those is its own change; see below.
>
> [DATABASE.md](DATABASE.md) is the permanent half and survives this file.

---

## Transcription status

Everything is transcribed, and `0001`–`0008` are **applied** to the linked project as of
2026-08-13. One correction, `0009`, is authored and not yet applied.

**`src/lib/supabase/types.ts` has not caught up.** It is 296 lines and knows none of the ten
tables `0006`–`0008` created — the migrations were pushed but `npm run db:types` never
landed. Run it after `0009` applies.

| Slice                                                                                    | Migration                              | Applied |
| ---------------------------------------------------------------------------------------- | -------------------------------------- | ------- |
| Extensions, the four enums, `set_updated_at()`                                           | `0001_extensions_and_types.sql`        | ✅      |
| `profiles`, `handle_new_user()`, `is_admin()`, role guard, `profiles` RLS                | `0002_profiles_and_auth.sql`           | ✅      |
| `settings` + `settings_history` + audit trigger + RLS + seed row                         | `0003_settings.sql`                    | ✅      |
| Markup columns renamed `*_multiplier` → `*_percent`                                      | `0004_settings_markup_units.sql`       | ✅      |
| `settings_history` SELECT narrowed to `is_admin()` (PRD-018B)                            | `0005_settings_history_admin_read.sql` | ✅      |
| Master data + `price_history` + triggers + RLS, `settings.updated_by` index              | `0006_master_data.sql`                 | ✅      |
| Quotes, lines, status history, **both** lifecycle triggers, RLS                          | `0007_quotes.sql`                      | ✅      |
| `fn_next_quote_number`, `fn_save_quote`, `fn_transition_quote_status`, `fn_save_product` | `0008_rpc_functions.sql`               | ✅      |
| `components.quoted_date` + both component logging functions — corrects `0006`            | `0009_components_quoted_date.sql`      | ⬜      |

**Never edit an applied file.** `db push` compares recorded versions, not contents, so an
edit to an applied migration is skipped silently while reading as though it landed. A new
decision is a new file — `0004` exists precisely because that happened once.

---

## 1. SQL Schema

Moved. Master data is `0006_master_data.sql`; quotes and the lifecycle triggers are
`0007_quotes.sql`. Read those files — they carry the full rationale in comments, including
why the approval gate is **two** triggers (`enforce_quote_created_in_draft` on INSERT,
`validate_quote_status_transition` on UPDATE) and why neither backstops the other.

Model-level rationale for the tables themselves stays in [DATABASE.md](DATABASE.md) §4–§5.

## 2. RPC Functions (Atomic Multi-Row Writes)

Moved to `0008_rpc_functions.sql`, whose header carries the `SECURITY INVOKER` reasoning,
the one deliberate `SECURITY DEFINER` exception (`fn_next_quote_number`, because
`quote_number_sequences` is policy-less under RLS), and the accepted trade-off that the
allocator is callable directly and so can leave gaps in the sequence.

## 3. RLS Policies

Moved. Each table's policies ship in the migration that creates the table — `0006` and
`0007` — per the convention `0002`/`0003` established: a table must never exist on a hosted
project with RLS off, even briefly.

The enforcement model those policies implement is stated in [DATABASE.md](DATABASE.md) §1
and §5.5. **The one thing that was only ever written here** — that "hardening" the approval
gate with an RLS `WITH CHECK` would silently decide the open "editing a quote after
submission" question in the freeze direction — is now [DATABASE.md](DATABASE.md) **§6.2**.
Read it before adding any policy that mentions `status`.

## 4. Implementation Notes

| §       | Subject                                          | Where it lives now                                                                              |
| ------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **4.1** | Do not wire the save RPC until PRD §7A signs off | [DATABASE.md](DATABASE.md) §6 (the §7A row) and §6.1; restated in `0008`'s header and CLAUDE.md |
| **4.2** | `profiles` role self-escalation                  | **Fixed.** `enforce_profile_role_change()` in `0002`, which documents its own carve-out         |
| **4.3** | `environment_mismatch` is client-supplied        | [DATABASE.md](DATABASE.md) **§5.6**                                                             |
| **4.4** | Regenerate types after every migration           | [TECH-STACK.md](TECH-STACK.md) §4 and CLAUDE.md — it was never unique to this file              |
| **4.5** | Testing surface — six untested invariants        | [ENGINEERING-RULES.md](ENGINEERING-RULES.md) §3, "Known gap", reframed as a gap register        |
| **4.6** | Markup units — percents everywhere               | `0004_settings_markup_units.sql`'s own comment, plus [DATABASE.md](DATABASE.md) §4.3            |

Nothing above is duplicated here. Each row is a pointer, not a summary — follow it.

---

## Deleting this file

Deferred deliberately, not forgotten. It was deleted once on 2026-08-13 and restored the
same day: the content was safely relocated, but roughly twenty citations across eight files
were not, and a reviewer reading `0006`–`0008` still needs the spec they were transcribed
from. Do it as its own change, after those migrations are applied.

The work, in full:

- **Source-of-truth docs** (each needs approval, per CLAUDE.md): [DATABASE.md](DATABASE.md)
  — header `Downstream:` plus three `[SQL spec §N]` links in §4.4, §4.10, §4.13;
  [ARCHITECTURE.md](ARCHITECTURE.md) §5; [TECH-STACK.md](TECH-STACK.md)'s anti-patterns
  table; [PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md)'s tree and its §5 transient-file
  example, which uses this file as _the_ illustration and needs a new one.
- **CLAUDE.md** — the "Approved design specs" entry, the "Built" paragraph, and the
  approval-gate invariant bullet.
- **README.md** and **`.claude/commands/db-migrate.md`** — one reference each.
- **`.claude/commands/doc-audit.md`** — nine references, and **structural**: this file is
  entry 9 in its audit list, its "Transcription status" is an input, and its DDL is named as
  the schema anchor for tables not yet migrated. That command needs reworking, not a link
  swap. Budget for it.
- **`src/components/quote-builder/lifecycle-bar.tsx`** (3 comments) and
  **`src/app/(app)/settings/_components/SettingsTabs.tsx`** (1).
- **`graphify-out/`** — a generated artifact; regenerate rather than edit.

**One cost is unavoidable and you are accepting it by deleting:** `0001`, `0002`, and `0003`
each name this file in their "Transcribed from" header, and they are applied and immutable.
Those references dangle permanently. `0001`'s comment even says the faithful transcription
"is what lets DATABASE-SQL.md be deleted later," which will read as a note about a file
nobody can open. That is the correct trade — a dead provenance comment is cheaper than a
live second copy of the schema — but it is a one-way door.
