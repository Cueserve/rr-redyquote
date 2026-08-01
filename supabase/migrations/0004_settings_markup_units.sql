-- ============================================================================
-- 0004: settings markup columns -- multipliers -> percents
--
-- 0003 shipped `fab_markup_multiplier` / `component_markup_multiplier`
-- (numeric(5,2), seeded 1.50 / 1.20) and IS ALREADY APPLIED to the linked
-- project, so it must not be edited -- a new decision is a new file
-- (CLAUDE.md, ARCHITECTURE §5). This migration carries the reversal.
--
-- UNITS (decided 2026-08-01): every rate on the settings row is a PERCENT. The
-- two markups become 50.00 / 20.00, NOT the 1.50 / 1.20 multipliers that
-- express the same business fact. Both readings are correct arithmetic; the
-- percent is the better column because:
--   - numeric(5,2) holding a multiplier can only step 0.01, which is one whole
--     percentage point of markup -- 18.5% is not representable. As a percent
--     the same type steps 0.01pp, 100x finer. The multiplier naming had
--     quietly locked in the coarser column.
--   - the quote-line markup cell is typed into by reps, who enter 18, not
--     1.18, so a multiplier column would need a conversion at the input
--     boundary -- the same "two units in one path" cost, just relocated.
--   - `quote_lines.markup_percent` (0005 onward) is pre-filled from
--     component_markup_percent and defaults to 0 (= no markup). Same unit end
--     to end, no conversion. The multiplier reading would have needed
--     `default 1`.
--   - PRD.md §2A already names its inputs "fabrication markup percent,
--     component markup percent". The multiplier rename contradicted it.
-- The pricing formula therefore applies cost * (1 + p/100) in one place, once
-- PRD §2A fixes the calculation order.
--
-- NOT REPLAYABLE, deliberately: step 4 is an arithmetic conversion, so running
-- it twice would square the restatement (and overflow numeric(5,2)). Supabase
-- records an applied version and never re-runs it; a `db reset` replays
-- 0003 (seeds 1.50 / 1.20) then this file exactly once, which is correct.
-- ============================================================================

-- ---------------------------------------------------------------- 1. rename
-- Postgres rewrites dependent CHECK expressions to follow the new names, so
-- settings_fab_markup_min reads `fab_markup_percent >= 1` after this until
-- step 2 replaces it.
alter table settings rename column fab_markup_multiplier to fab_markup_percent;
alter table settings rename column component_markup_multiplier to component_markup_percent;

-- ----------------------------------------------------------- 2. constraints
-- The old floor was `>= 1`: a multiplier below 1 would price below cost. As a
-- percent that same floor is `>= 0` -- a 0% markup is meaningful (it prices at
-- cost) and 1% is not a floor anyone intended. Still no upper bound: PRD §2A
-- has not fixed the sane ranges, and a wrong ceiling is worse than none.
alter table settings drop constraint settings_fab_markup_min;
alter table settings drop constraint settings_component_markup_min;

alter table settings
  add constraint settings_fab_markup_nonneg check (fab_markup_percent >= 0);
alter table settings
  add constraint settings_component_markup_nonneg check (component_markup_percent >= 0);

-- ------------------------------------------------------- 3. audit trigger fn
-- MUST run before step 4, and before any settings UPDATE reaches the app.
-- log_settings_change() hardcodes its column list and reads each one with
-- `format('select ($1).%I', col)`. Left pointing at fab_markup_multiplier it
-- raises "column not found in data type settings" on EVERY settings update,
-- because the dynamic SELECT is only parsed at runtime -- the rename above
-- cannot fail loudly here, it just arms the failure.
--
-- Body is otherwise byte-identical to 0003's. The column list stays hardcoded
-- for the same reason it was there: a settings column added later without
-- being added here is silently unaudited. Keep them in sync.
create or replace function log_settings_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_col   text;
  v_old   text;
  v_new   text;
begin
  for v_col in
    select unnest(array[
      'labor_rate','fab_markup_percent','component_markup_percent','cushion_percent',
      'commission_percent','margin_floor_percent','freshness_warning_months',
      'freshness_requote_months','favicon_url'
    ])
  loop
    execute format('select ($1).%I::text, ($2).%I::text', v_col, v_col)
      into v_old, v_new using old, new;
    if v_old is distinct from v_new then
      insert into settings_history(changed_field, old_value, new_value, actor)
      values (v_col, v_old, v_new, v_actor);
    end if;
  end loop;
  return new;
end;
$$;

-- ---------------------------------------------------------------- 4. values
-- Both triggers are disabled around this UPDATE, for different reasons:
--
--   settings_audit        -- `actor` is NOT NULL and filled from auth.uid(),
--                            which is NULL in a migration. The insert would
--                            fail the NOT NULL and abort the whole push.
--                            0003's own header carries this warning.
--   settings_set_updated_at -- nobody changed this setting. 1.50x and 50% are
--                            the same business fact; only the storage
--                            representation moved. Bumping updated_at would
--                            make the settings screen report an edit that did
--                            not happen, against a NULL updated_by.
--
-- Arithmetic conversion rather than a literal `set = 50.00, 20.00`: it states
-- the relationship between the two representations, and stays correct if the
-- seeded row were ever changed before this ran. On the actual seed it yields
-- exactly 50.00 and 20.00.
alter table settings disable trigger settings_audit;
alter table settings disable trigger settings_set_updated_at;

update settings set
  fab_markup_percent       = (fab_markup_percent - 1) * 100,
  component_markup_percent = (component_markup_percent - 1) * 100;

alter table settings enable trigger settings_set_updated_at;
alter table settings enable trigger settings_audit;
