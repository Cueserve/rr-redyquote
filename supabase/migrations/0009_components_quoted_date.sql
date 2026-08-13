-- ============================================================================
-- 0009: components.quoted_date — the vendor's quote date (PRD-009)
--
-- Corrects 0006, which is merged to main and therefore immutable. 0006 gave
-- `components` no date column of its own, so both component price-history paths
-- fell back to `current_date` -- the moment a change was recorded -- while the
-- fab-tier paths wrote the vendor's `quoted_date` from the row. PRD-009 then
-- applied one set of thresholds (settings.freshness_warning_months /
-- freshness_requote_months) to two different measurements: "how long since we
-- edited this" for components, "how long since the vendor quoted" for fab tiers.
--
-- The freshness badge exists so a rep knows whether to trust a price before
-- quoting it. The recency of our own edits does not answer that question, so the
-- component reading was the wrong one. Model: docs/DATABASE.md §4.8 and §4.9.
--
-- A NEW FILE rather than an edit to 0006, for the reason 0004 exists: `db push`
-- compares recorded versions, not file contents, so editing a merged migration is
-- skipped silently while reading as though it landed.
-- ============================================================================

-- NOT NULL with no default, matching fab_tiers.quoted_date exactly -- the point
-- of this migration is that the two columns mean the same thing.
--
-- Safe because `components` is empty: 0006 creates it and nothing seeds it.
-- PRD-007A's fixed category list is still an open product decision and
-- `components.category_id` is NOT NULL, so the catalog cannot have been populated
-- yet. If rows somehow exist, this statement fails loudly and the whole migration
-- rolls back -- which is the correct outcome. Backfilling a placeholder would put
-- a fabricated vendor quote date behind a freshness badge a rep is meant to trust,
-- which is worse than a migration that refuses to run.
alter table components add column quoted_date date not null;

-- Both component logging functions switch current_date -> new.quoted_date.
-- `create or replace function` rebinds the existing triggers in place
-- (components_price_history, components_price_history_insert) -- they do not need
-- dropping or recreating, and deliberately are not touched here.
--
-- The fab-tier equivalents are already correct in 0006 and are left alone.
create or replace function log_component_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.cost is distinct from old.cost then
    insert into price_history(source_type, component_id, cost, quoted_date, vendor, changed_by)
    values ('component', new.id, new.cost, new.quoted_date, new.vendor, auth.uid());
  end if;
  return new;
end;
$$;

create or replace function log_component_price_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into price_history(source_type, component_id, cost, quoted_date, vendor, changed_by)
  values ('component', new.id, new.cost, new.quoted_date, new.vendor, auth.uid());
  return new;
end;
$$;
