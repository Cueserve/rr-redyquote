-- ============================================================================
-- 0003: settings (singleton) + settings_history audit + RLS + seed row
--
-- Transcribed from docs/DATABASE-SQL.md §1 (block "0003", settings tables only)
-- and §3 (settings / settings_history policies). PRD-012, PRD-018A.
--
-- Two deliberate deviations from that spec, both approved 2026-08-01:
--
-- 1. UNITS. fab_markup / component_markup are MULTIPLIERS (1.5 = 1.5x cost),
--    not percents, so the columns are named `_multiplier` and the doc's
--    `_percent` names are superseded. cushion / commission / margin_floor stay
--    true percents. The row is therefore intentionally mixed-unit -- do not
--    "normalise" it without re-checking PRD §2A, and do not feed a multiplier
--    into a percent slot: on a $10,000 fab cost the two readings differ by 48%.
--
-- 2. SEED. The single row is seeded here rather than in a separate
--    0007_seed_settings, because every column is NOT NULL with no default --
--    a settings table with no row is a broken state to push.
-- ============================================================================

create table settings (
  id                          boolean primary key default true,
  labor_rate                  numeric(10,2) not null,
  fab_markup_multiplier       numeric(5,2) not null,
  component_markup_multiplier numeric(5,2) not null,
  cushion_percent             numeric(5,2) not null,
  commission_percent          numeric(5,2) not null,
  margin_floor_percent        numeric(5,2) not null,
  freshness_warning_months    smallint not null,
  freshness_requote_months    smallint not null,
  favicon_url                 text,
  updated_by                  uuid references profiles(id),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  constraint settings_singleton check (id),
  constraint settings_freshness_order check (freshness_requote_months > freshness_warning_months),

  -- A multiplier below 1 would price below cost; a negative rate or percent is
  -- never meaningful. No upper bounds: PRD §2A has not fixed the sane ranges,
  -- and a wrong ceiling is worse than none.
  constraint settings_labor_rate_nonneg check (labor_rate >= 0),
  constraint settings_fab_markup_min check (fab_markup_multiplier >= 1),
  constraint settings_component_markup_min check (component_markup_multiplier >= 1),
  constraint settings_cushion_nonneg check (cushion_percent >= 0),
  constraint settings_commission_nonneg check (commission_percent >= 0),
  constraint settings_margin_floor_nonneg check (margin_floor_percent >= 0),
  constraint settings_freshness_warning_positive check (freshness_warning_months >= 1)
);

create trigger settings_set_updated_at
  before update on settings for each row execute function set_updated_at();

create table settings_history (
  id             uuid primary key default gen_random_uuid(),
  changed_field  text not null,
  old_value      text,
  new_value      text,
  actor          uuid not null references profiles(id),
  changed_at     timestamptz not null default now()
);
create index idx_settings_history_actor on settings_history(actor);
create index idx_settings_history_changed_at on settings_history(changed_at desc);

-- ----------------------------------------------------------------------------
-- Audit trigger: log every changed settings field in the same transaction
-- (PRD-018A). AFTER UPDATE only -- an INSERT writes no history, which is why
-- the seed below is safe.
--
-- WARNING for future migrations: `actor` is NOT NULL and is filled from
-- auth.uid(), which is NULL outside a user session. Any data migration that
-- UPDATEs `settings` will therefore fail on that NOT NULL. Change settings
-- through the app, or drop/recreate this trigger around such a migration
-- deliberately.
--
-- The column list is hardcoded: a settings column added later without being
-- added here is silently unaudited. Keep them in sync.
-- ----------------------------------------------------------------------------
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
      'labor_rate','fab_markup_multiplier','component_markup_multiplier','cushion_percent',
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

create trigger settings_audit
  after update on settings
  for each row execute function log_settings_change();

-- ----------------------------------------------------------------- settings RLS
alter table settings enable row level security;
alter table settings_history enable row level security;

create policy "settings_select_authenticated"
  on settings for select to authenticated using (true);
create policy "settings_update_admin"
  on settings for update to authenticated using (is_admin()) with check (is_admin());
-- no INSERT/DELETE policy: the single row is seeded once, below

create policy "settings_history_select_authenticated"
  on settings_history for select to authenticated using (true);
-- no INSERT/UPDATE/DELETE policy: written only by log_settings_change() (SECURITY DEFINER)

-- ------------------------------------------------------------------ seed row
-- `on conflict do nothing` keeps this replayable, so `supabase db reset` still
-- builds a correct schema from empty (ENVIRONMENTS §4 step 4).
-- updated_by stays NULL: no user made this change.
insert into settings (
  id,
  labor_rate,
  fab_markup_multiplier,
  component_markup_multiplier,
  cushion_percent,
  commission_percent,
  margin_floor_percent,
  freshness_warning_months,
  freshness_requote_months
)
values (true, 50.00, 1.50, 1.20, 2.50, 1.25, 20.00, 12, 24)
on conflict (id) do nothing;
