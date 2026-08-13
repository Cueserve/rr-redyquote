-- ============================================================================
-- 0006: master data — categories, products, fab_tiers, components,
--       product_defaults, price_history + their RLS
--
-- Model and rationale: docs/DATABASE.md §4.2, §4.5-§4.9, and §5.4 (why
-- price_history is one polymorphic table). PRD-004, PRD-005, PRD-006, PRD-007A,
-- PRD-018, NFR-005. This file is the schema; the doc is the model.
--
-- Depends on, and does not restate, what 0001-0005 already put on this project:
-- pgcrypto, the four enums, set_updated_at(), profiles, and is_admin(). Those
-- files are applied and immutable; read them there.
--
-- RLS ships in this file rather than a trailing policies migration, per the
-- convention 0002/0003 established: a table must never exist on a hosted
-- project with RLS off, even briefly.
--
-- `categories` ships EMPTY on purpose. PRD-007A's fixed category list is an open
-- product decision (docs/DATABASE.md §6) and nothing in this repo invents it.
-- The table is a lookup rather than a Postgres enum precisely so that list can
-- be entered as data once REDYREF decides it, with no schema change.
-- ============================================================================

-- ------------------------------------------------------------------ backfill
-- settings.updated_by is a foreign key and 0003 shipped it without an index.
-- 0003 is applied and immutable, so the index lands here.
--
-- Be clear about what this index is for, because it is NOT performance.
-- Postgres will never use it: `settings` holds exactly one row for the life of
-- the product (boolean PK with CHECK (id)), so any scan of it is bounded at one
-- row, and the parent-delete scan that unindexed foreign keys really cost you
-- cannot happen either -- profiles rows are never deleted (no DELETE policy in
-- 0002) and profiles.id is the auth.users id, which is never updated.
--
-- It exists so "every FK column is indexed" (docs/DATABASE.md §4) stays a rule
-- a query against pg_indexes can verify with ZERO exceptions. Decided
-- 2026-08-13 over documenting a carve-out: a check that always returns one
-- known-good row is a check people stop running. Do not "clean it up" as
-- unused -- unused is the point.
create index idx_settings_updated_by on settings(updated_by);

-- ---------------------------------------------------------------- categories
create table categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger categories_set_updated_at
  before update on categories for each row execute function set_updated_at();

alter table categories enable row level security;

create policy "categories_select_authenticated"
  on categories for select to authenticated using (true);
create policy "categories_write_admin"
  on categories for insert to authenticated with check (is_admin());
create policy "categories_update_admin"
  on categories for update to authenticated using (is_admin()) with check (is_admin());
-- no DELETE policy: a category is retired via is_active = false, not removed --
-- quote_lines.category_id references it and history must stay joinable.

-- ------------------------------------------------------------------ products
create table products (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  sku               text not null unique,
  description       text,
  vendor            text,
  est_labor_hours   numeric(6,2) not null default 0 check (est_labor_hours >= 0),
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_products_active on products(active);
create trigger products_set_updated_at
  before update on products for each row execute function set_updated_at();

alter table products enable row level security;

create policy "products_select_authenticated"
  on products for select to authenticated using (true);
create policy "products_insert_admin"
  on products for insert to authenticated with check (is_admin());
create policy "products_update_admin"
  on products for update to authenticated using (is_admin()) with check (is_admin());
-- no DELETE policy: deactivate via `active = false` (PRD-018), never hard-delete

-- ----------------------------------------------------------------- fab_tiers
create table fab_tiers (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products(id) on delete cascade,
  qty_tier      integer not null check (qty_tier > 0),
  cost          numeric(12,2) not null check (cost >= 0),
  quoted_date   date not null,
  vendor        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (product_id, qty_tier)
);
create index idx_fab_tiers_product_id on fab_tiers(product_id);
create trigger fab_tiers_set_updated_at
  before update on fab_tiers for each row execute function set_updated_at();

alter table fab_tiers enable row level security;

create policy "fab_tiers_select_authenticated"
  on fab_tiers for select to authenticated using (true);
create policy "fab_tiers_write_admin"
  on fab_tiers for insert to authenticated with check (is_admin());
create policy "fab_tiers_update_admin"
  on fab_tiers for update to authenticated using (is_admin()) with check (is_admin());
create policy "fab_tiers_delete_admin"
  on fab_tiers for delete to authenticated using (is_admin());
-- DELETE is allowed here, unlike products/components: removing a tier from a
-- product's live tier list -- what fn_save_product's reconciliation delete does
-- -- is a structural edit, not a deletion of quote-referencing history. The
-- historical cost already moved to price_history before removal, and a tier a
-- saved quote points at is refused by the FK regardless (see 0008).

-- ---------------------------------------------------------------- components
create table components (
  id                    uuid primary key default gen_random_uuid(),
  category_id           uuid not null references categories(id),
  name                  text not null,
  sku                   text not null unique,
  vendor                text,
  environment           environment_type not null default 'any',
  cost                  numeric(12,2) not null check (cost >= 0),
  default_labor_hours   numeric(6,2) not null default 0 check (default_labor_hours >= 0),
  active                boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index idx_components_category_id on components(category_id);
create index idx_components_active on components(active);
create trigger components_set_updated_at
  before update on components for each row execute function set_updated_at();

alter table components enable row level security;

create policy "components_select_authenticated"
  on components for select to authenticated using (true);
create policy "components_insert_admin"
  on components for insert to authenticated with check (is_admin());
create policy "components_update_admin"
  on components for update to authenticated using (is_admin()) with check (is_admin());
-- no DELETE policy: deactivate via `active = false` (PRD-018), never hard-delete

-- ---------------------------------------------------------- product_defaults
create table product_defaults (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products(id) on delete cascade,
  category_id   uuid not null references categories(id),
  component_id  uuid not null references components(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (product_id, category_id)
);
create index idx_product_defaults_product_id on product_defaults(product_id);
create index idx_product_defaults_category_id on product_defaults(category_id);
create index idx_product_defaults_component_id on product_defaults(component_id);
create trigger product_defaults_set_updated_at
  before update on product_defaults for each row execute function set_updated_at();

alter table product_defaults enable row level security;

create policy "product_defaults_select_authenticated"
  on product_defaults for select to authenticated using (true);
create policy "product_defaults_write_admin"
  on product_defaults for insert to authenticated with check (is_admin());
create policy "product_defaults_update_admin"
  on product_defaults for update to authenticated using (is_admin()) with check (is_admin());
create policy "product_defaults_delete_admin"
  on product_defaults for delete to authenticated using (is_admin());

-- ------------------------------------------------------------- price_history
-- Append-only cost history for EITHER a component OR a fab tier, discriminated
-- by source_type. One polymorphic table rather than two, matching
-- ARCHITECTURE.md's data-design table; the CHECK below is what two separate
-- tables would have got for free from their own NOT NULLs (docs/DATABASE.md
-- §5.4).
create table price_history (
  id            uuid primary key default gen_random_uuid(),
  source_type   text not null check (source_type in ('component', 'fab_tier')),
  component_id  uuid references components(id),
  product_id    uuid references products(id),
  qty_tier      integer,
  cost          numeric(12,2) not null,
  quoted_date   date not null,
  vendor        text,
  changed_by    uuid not null references profiles(id),
  created_at    timestamptz not null default now(),
  constraint price_history_source_shape check (
    (source_type = 'component' and component_id is not null and product_id is null and qty_tier is null)
    or
    (source_type = 'fab_tier' and product_id is not null and qty_tier is not null and component_id is null)
  )
);
create index idx_price_history_component_id on price_history(component_id);
create index idx_price_history_product_tier on price_history(product_id, qty_tier);
create index idx_price_history_changed_by on price_history(changed_by);

alter table price_history enable row level security;

create policy "price_history_select_authenticated"
  on price_history for select to authenticated using (true);
-- No INSERT/UPDATE/DELETE policy at all. Rows arrive exclusively through the
-- SECURITY DEFINER triggers below, which is what makes "append, never
-- overwrite" a database guarantee rather than an application convention
-- (NFR-005). Adding a write policy here would silently downgrade it.

-- Auto-append price history when a live cost changes (NFR-005)
create or replace function log_component_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.cost is distinct from old.cost then
    insert into price_history(source_type, component_id, cost, quoted_date, vendor, changed_by)
    values ('component', new.id, new.cost, current_date, new.vendor, auth.uid());
  end if;
  return new;
end;
$$;
create trigger components_price_history
  after update on components
  for each row execute function log_component_price_change();

create or replace function log_fab_tier_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.cost is distinct from old.cost then
    insert into price_history(source_type, product_id, qty_tier, cost, quoted_date, vendor, changed_by)
    values ('fab_tier', new.product_id, new.qty_tier, new.cost, new.quoted_date, new.vendor, auth.uid());
  end if;
  return new;
end;
$$;
create trigger fab_tiers_price_history
  after update on fab_tiers
  for each row execute function log_fab_tier_price_change();

-- Seed history on INSERT as well, so a cost has a date from the moment it exists
-- (PRD-009).
--
-- Without these, the two triggers above are AFTER UPDATE only and a brand-new
-- component or fab tier carries no price_history row at all. `components` has no
-- `quoted_date` column -- src/lib/mock/types.ts defines a component's date as
-- "latest price_history.quoted_date" -- so every component would render with
-- unknown freshness until somebody happened to edit its cost. PRD-009's badge and
-- the dashboard's stale-price count would have nothing to read on a fresh
-- catalog, which is exactly when they matter most.
--
-- The two differ on where the date comes from, and that asymmetry is forced, not
-- sloppy: `fab_tiers` carries its own `quoted_date` (the vendor's quote date), and
-- `components` has none, so `current_date` -- the date the cost was recorded -- is
-- the only thing available. Same column, two meanings. If PRD-009's thresholds are
-- meant to measure vendor-quote age specifically, components are measuring
-- something slightly different and need a `quoted_date` column of their own.
--
-- Consequence to know before seeding the catalog: `price_history.changed_by` is
-- NOT NULL and these write `auth.uid()`, so a component or tier CANNOT be created
-- from a dashboard or migration session. That is consistent with the same rule on
-- quote_status_history.actor -- every history row names a real person -- but it
-- means a bulk catalog import must disable these triggers around the load.
create or replace function log_component_price_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into price_history(source_type, component_id, cost, quoted_date, vendor, changed_by)
  values ('component', new.id, new.cost, current_date, new.vendor, auth.uid());
  return new;
end;
$$;
create trigger components_price_history_insert
  after insert on components
  for each row execute function log_component_price_insert();

create or replace function log_fab_tier_price_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into price_history(source_type, product_id, qty_tier, cost, quoted_date, vendor, changed_by)
  values ('fab_tier', new.product_id, new.qty_tier, new.cost, new.quoted_date, new.vendor, auth.uid());
  return new;
end;
$$;
create trigger fab_tiers_price_history_insert
  after insert on fab_tiers
  for each row execute function log_fab_tier_price_insert();
