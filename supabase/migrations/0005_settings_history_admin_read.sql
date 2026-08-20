-- ============================================================================
-- 0005: settings_history read becomes admin-only (PRD-018B)
--
-- 0003 shipped `settings_history_select_authenticated ... using (true)` and IS
-- ALREADY APPLIED to the linked project, so it must not be edited -- a new
-- decision is a new file (CLAUDE.md, ARCHITECTURE §5). This migration carries
-- the narrowing.
--
-- WHY (decided 2026-08-08, PRD-018B): the flat read on this table was never a
-- decision. It was the pattern copied from every other table, where flat is
-- correct -- PRD-019 makes reads flat and writes role-gated. `settings_history`
-- is the one table where that default is wrong: it records every change to
-- `commission_percent`, `margin_floor_percent`, and both markups, which is
-- compensation-adjacent information. A rep reading it learns the margin the
-- business prices at and every time it moved.
--
-- This is the ONLY exception to flat reads in the schema. Do not generalize it
-- to the other history tables: `price_history` is vendor cost data every rep
-- needs while quoting, and `quote_status_history` is the audit trail of a
-- workflow reps participate in. Narrowing either would break the product.
--
-- REPLAYABLE: drop-if-exists then create. A `db reset` replays 0003 (flat
-- policy) then this file, ending admin-only, which is the intended end state.
--
-- NOT A DATA MIGRATION: no rows move and no column changes. The audit trigger
-- log_settings_change() is SECURITY DEFINER and writes rows regardless of who
-- the caller is, so tightening SELECT does not affect what gets recorded --
-- only who can read it back.
-- ============================================================================

-- --------------------------------------------------------------- 1. drop old
-- `if exists` so the file is replayable and so a reset that has not yet run
-- 0003's policy creation cannot fail here.
drop policy if exists "settings_history_select_authenticated" on settings_history;

-- --------------------------------------------------------------- 2. admin read
-- is_admin() is SECURITY DEFINER (0002), so calling it from a policy on this
-- table does not recurse through `profiles`' own policies.
--
-- Deliberately still `to authenticated`, not `to admin`: there is no `admin`
-- Postgres role. The two-role model lives in `profiles.role`, evaluated per
-- request by is_admin() -- one runtime role at the connection level
-- (ARCHITECTURE §1). A rep reaching this table gets zero rows, not an error.
create policy "settings_history_select_admin"
  on settings_history for select
  to authenticated
  using (is_admin());

-- No INSERT/UPDATE/DELETE policy, unchanged from 0003: rows are written only by
-- log_settings_change() (SECURITY DEFINER), which is what makes "append-only" a
-- database guarantee rather than an application convention.
