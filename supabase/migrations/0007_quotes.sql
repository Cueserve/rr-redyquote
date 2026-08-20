-- ============================================================================
-- 0007: quotes — quote_number_sequences, quotes, quote_lines,
--       quote_status_history, the lifecycle triggers, and their RLS
--
-- Model and rationale: docs/DATABASE.md §4.10-§4.13, §5.1 (pricing columns are
-- storage, not a formula), and §5.5 (this file's insert guard). PRD-007,
-- PRD-007A, PRD-010, PRD-011, PRD-016, PRD-017, NFR-002, NFR-005.
--
-- THE APPROVAL GATE LIVES IN THIS FILE, and it is two triggers, not one:
--
--   enforce_quote_created_in_draft    BEFORE INSERT  -- a quote is born in Draft
--   validate_quote_status_transition  BEFORE UPDATE  -- and moves only legally
--
-- Both are load-bearing and neither is a backstop for the other. RLS is a
-- backstop for neither: a WITH CHECK clause cannot see the old row, so it cannot
-- express a transition at all, and quotes_insert_own below checks ownership and
-- nothing else. Weakening either trigger on the assumption that RLS still has
-- you covered is the single most costly mistake available in this schema
-- (docs/DATABASE.md §5.5). Before adding any policy that mentions `status`, read
-- docs/DATABASE.md §6.2 -- the obvious WITH CHECK also decides an open product
-- question, silently, in a diff that looks like security work.
--
-- Note the enum: the lifecycle step every doc calls `Review` is stored as
-- 'pending_approval'. There is no 'review' value (0001).
-- ============================================================================

-- ---------------------------------------------------- quote_number_sequences
-- Internal counter behind PRD-011's race-free Q-YYYY-NNNN numbering. Never read
-- or written by application code -- only by fn_next_quote_number() (0008).
create table quote_number_sequences (
  year         smallint primary key,
  last_number  integer not null default 0
);

alter table quote_number_sequences enable row level security;
-- RLS enabled with ZERO policies, and it STAYS that way. Zero policies means no
-- `authenticated` caller can reach this table at all -- which is the point,
-- because the counter is the one thing a client must never be able to rewind.
-- It is reachable only through fn_next_quote_number(), which is SECURITY
-- DEFINER for exactly this reason.
--
-- Do not "fix" a permission-denied here by adding a policy. RLS applies per
-- table, per statement, to whoever the invoker is -- a SECURITY INVOKER
-- fn_save_quote does NOT inherit reach into this table from its privileges on
-- `quotes`. Adding a policy would hand every authenticated user the counter.

-- -------------------------------------------------------------------- quotes
create table quotes (
  id                    uuid primary key default gen_random_uuid(),
  quote_number          text not null unique,
  customer_name         text not null,
  product_id            uuid not null references products(id),
  fab_tier_id           uuid not null references fab_tiers(id),
  fab_cost_snapshot     numeric(12,2) not null,
  environment           quote_environment not null,
  status                quote_status not null default 'draft',
  owner_id              uuid not null references profiles(id),
  approved_by           uuid references profiles(id),
  submitted_at          timestamptz,
  approved_at           timestamptz,
  sent_at               timestamptz,
  total_hard_cost       numeric(12,2) not null default 0,
  total_labor_cost      numeric(12,2) not null default 0,
  cushion_amount        numeric(12,2) not null default 0,
  commission_amount     numeric(12,2) not null default 0,
  total_cost            numeric(12,2) not null default 0,
  final_price_each      numeric(12,2) not null default 0,
  gp_dollars            numeric(12,2) not null default 0,
  gp_percent            numeric(6,3) not null default 0,
  below_margin_floor    boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
-- The nine pricing columns above plus fab_cost_snapshot are STORAGE for values
-- the server recomputes (NFR-007). There is no formula, trigger, or generated
-- column behind them -- PRD §7A has not fixed one, and nothing here invents it
-- (docs/DATABASE.md §5.1). fab_cost_snapshot and quote_lines.hard_cost capture
-- cost as of the save, so a later tier or component re-price never silently
-- drifts an already-saved quote.
create index idx_quotes_owner_id on quotes(owner_id);
create index idx_quotes_approved_by on quotes(approved_by);
create index idx_quotes_product_id on quotes(product_id);
create index idx_quotes_fab_tier_id on quotes(fab_tier_id);
create index idx_quotes_status on quotes(status);
create trigger quotes_set_updated_at
  before update on quotes for each row execute function set_updated_at();

-- --------------------------------------------------------------- quote_lines
create table quote_lines (
  id                    uuid primary key default gen_random_uuid(),
  quote_id              uuid not null references quotes(id) on delete cascade,
  category_id           uuid references categories(id),
  component_id          uuid references components(id),
  description           text not null,
  is_misc               boolean not null default false,
  hard_cost             numeric(12,2) not null default 0,
  labor_hours           numeric(6,2) not null default 0,
  labor_cost            numeric(12,2) not null default 0,
  markup_percent        numeric(5,2) not null default 0,
  environment_mismatch  boolean not null default false,
  sort_order            integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint quote_lines_category_required_unless_misc check (is_misc or category_id is not null)
);
-- markup_percent is a PERCENT, same unit as settings.component_markup_percent,
-- so the pre-fill from settings is a straight copy with no conversion. `default
-- 0` therefore reads as "no markup" -- a multiplier column would have needed
-- `default 1`. Full rationale is in 0004's own header; the model is
-- docs/DATABASE.md §4.3.
create index idx_quote_lines_quote_id on quote_lines(quote_id);
create index idx_quote_lines_category_id on quote_lines(category_id);
create index idx_quote_lines_component_id on quote_lines(component_id);
-- PRD-007A: at most one non-misc line per fixed category per quote. Misc lines
-- are unlimited, which is why this is a partial index rather than a constraint.
create unique index uq_quote_lines_one_per_fixed_category
  on quote_lines(quote_id, category_id) where not is_misc;
create trigger quote_lines_set_updated_at
  before update on quote_lines for each row execute function set_updated_at();

-- ------------------------------------------------------- quote_status_history
create table quote_status_history (
  id           uuid primary key default gen_random_uuid(),
  quote_id     uuid not null references quotes(id) on delete cascade,
  from_status  text,
  to_status    text not null,
  actor        uuid not null references profiles(id),
  changed_at   timestamptz not null default now()
);
create index idx_quote_status_history_quote_id on quote_status_history(quote_id);
create index idx_quote_status_history_actor on quote_status_history(actor);

-- ============================================================================
-- Lifecycle triggers
-- ============================================================================

-- Force a new quote to be born in Draft (PRD-010, NFR-002, DATABASE.md §5.5)
--
-- validate_quote_status_transition below is BEFORE UPDATE, so it never sees an
-- INSERT -- and quotes_insert_own checks owner_id and nothing else. Without this
-- trigger a rep holding a valid session can POST a row straight at the Data API
-- carrying status='approved', approved_by=<self>, approved_at=now(), and the
-- database accepts it: no Server Action, no UI, no admin.
--
-- It RAISES rather than coercing to draft. Coercing would never break a caller,
-- but it hands a bypassed client a success response and leaves the attempt no
-- trace -- a guard that cannot be observed failing is indistinguishable from one
-- nobody added. Same choice as enforce_profile_role_change (0002).
--
-- NO `auth.uid() is not null` CARVE-OUT, unlike enforce_profile_role_change in
-- 0002. That difference is deliberate and was decided 2026-08-13 after the
-- carve-out was drafted and then removed.
--
-- 0002 needs its carve-out to solve a BOOTSTRAP problem: handle_new_user()
-- always writes 'rep', so without an exemption for the NULL-auth.uid() dashboard
-- session the schema could never have a first admin at all. Importing historical
-- quotes has no such chicken-and-egg -- it is ordinary data loading.
--
-- The carve-out also did not work. log_quote_status_insert below writes
-- auth.uid() into quote_status_history.actor, which is NOT NULL, so a
-- postgres-context insert fails at the audit row whether this trigger exempts it
-- or not. Making it work would have meant giving up that NOT NULL permanently --
-- trading a standing guarantee that every audit row names a real person for a
-- convenience on a one-time event that is not in the PRD.
--
-- If REDYREF ever does import historical quotes, that migration turns both
-- triggers off around the load and back on after, which is explicit and shows up
-- in review:
--   alter table quotes disable trigger quotes_enforce_created_in_draft;
--   alter table quotes disable trigger quotes_log_status_insert;
--   <load rows>
--   alter table quotes enable trigger quotes_log_status_insert;
--   alter table quotes enable trigger quotes_enforce_created_in_draft;
--
-- LIFECYCLE COLUMNS ONLY. The nine pricing columns and fab_cost_snapshot stay
-- openly writable by the row owner; that gap is deferred to PRD §7A on purpose
-- (docs/DATABASE.md §5.1 and §6.1). Do not read this trigger as covering them.
create or replace function enforce_quote_created_in_draft()
returns trigger
language plpgsql
as $$
begin
  if new.status <> 'draft'
     or new.submitted_at is not null
     or new.approved_by  is not null
     or new.approved_at  is not null
     or new.sent_at      is not null then
    raise exception
      'A quote must be created in Draft with no lifecycle stamps (PRD-010)';
  end if;
  return new;
end;
$$;

create trigger quotes_enforce_created_in_draft
  before insert on quotes
  for each row execute function enforce_quote_created_in_draft();

-- Validate the state machine BEFORE the row is written (PRD-010, NFR-002)
--
-- FOUR legal transitions, not three. PRD-010 defines the lifecycle as
-- Draft -> Review -> Approved -> Sent PLUS Review -> Draft ("request changes"),
-- and states that BOTH exits from Review -- forward to Approved and back to
-- Draft -- are admin-only. An earlier draft of this function carried only three
-- and would have raised on request-changes, silently deleting a documented path
-- (ARCHITECTURE §7, docs/DATABASE.md §1).
create or replace function validate_quote_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new; -- ordinary content edit, no transition
  end if;

  if old.status = 'draft' and new.status = 'pending_approval' then
    new.submitted_at := now();
  elsif old.status = 'pending_approval' and new.status = 'approved' then
    if not is_admin() then
      raise exception 'Only an admin may approve a quote (PRD-010)';
    end if;
    new.approved_by := auth.uid();
    new.approved_at := now();
  elsif old.status = 'pending_approval' and new.status = 'draft' then
    -- Request changes. Admin-only for the same reason approval is: PRD-010
    -- puts both exits from Review in the admin's hands, so a rep cannot pull
    -- their own quote back out of review.
    if not is_admin() then
      raise exception 'Only an admin may send a quote back to Draft (PRD-010)';
    end if;
    -- Clear the submission stamp: these columns describe where the quote IS,
    -- not where it has been -- quote_status_history is the trail. Leaving a
    -- stale submitted_at would make the next submission look like the first.
    new.submitted_at := null;
  elsif old.status = 'approved' and new.status = 'sent' then
    new.sent_at := now();
  else
    raise exception 'Invalid quote status transition: % -> %', old.status, new.status;
  end if;

  return new;
end;
$$;
create trigger quotes_validate_status_transition
  before update on quotes
  for each row execute function validate_quote_status_transition();

-- Log every status change AFTER it's validated and applied (PRD-017, NFR-005)
create or replace function log_quote_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into quote_status_history(quote_id, from_status, to_status, actor)
    values (new.id, old.status::text, new.status::text, auth.uid());
  end if;
  return new;
end;
$$;
create trigger quotes_log_status_change
  after update on quotes
  for each row execute function log_quote_status_change();

-- Log the initial Draft creation too
create or replace function log_quote_status_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into quote_status_history(quote_id, from_status, to_status, actor)
  values (new.id, null, new.status::text, auth.uid());
  return new;
end;
$$;
create trigger quotes_log_status_insert
  after insert on quotes
  for each row execute function log_quote_status_insert();

-- ============================================================================
-- RLS
-- ============================================================================
alter table quotes enable row level security;
alter table quote_lines enable row level security;
alter table quote_status_history enable row level security;

-- -------------------------------------------------------------------- quotes
create policy "quotes_select_authenticated"
  on quotes for select to authenticated using (true);

create policy "quotes_insert_own"
  on quotes for insert to authenticated
  with check (owner_id = auth.uid());
-- This policy checks ownership and NOTHING ELSE -- not status, not the lifecycle
-- stamps, not the pricing columns. It is deliberately left permissive because
-- fn_save_quote is SECURITY INVOKER and needs it. What stops a rep POSTing a row
-- straight to 'approved' is enforce_quote_created_in_draft above, a BEFORE
-- INSERT trigger -- not this. Do not read `with check` here as a lifecycle guard.

create policy "quotes_update_owner_or_admin"
  on quotes for update to authenticated
  using (owner_id = auth.uid() or is_admin())
  with check (owner_id = auth.uid() or is_admin());
-- "Only an admin may move Review -> Approved" is NOT expressed here and cannot
-- be: WITH CHECK sees only the new row. validate_quote_status_transition is the
-- only thing enforcing it. There is no second RLS layer on the approval gate --
-- do not weaken the trigger believing otherwise.
--
-- KNOWN, DEFERRED GAP: this grants table-wide UPDATE, so the row's owner can
-- write the nine pricing columns and fab_cost_snapshot directly over the Data
-- API. The server-side pricing trust boundary is therefore a Server Action
-- convention, not a database guarantee, until PRD §7A fixes the canonical column
-- list and the guard is authored (docs/DATABASE.md §5.1 and §6.1).
--
-- no DELETE policy: quotes are never deleted.

-- --------------------------------------------------------------- quote_lines
create policy "quote_lines_select_authenticated"
  on quote_lines for select to authenticated using (true);

create policy "quote_lines_write_owner_or_admin"
  on quote_lines for insert to authenticated
  with check (
    exists (
      select 1 from quotes q
      where q.id = quote_lines.quote_id
        and (q.owner_id = auth.uid() or is_admin())
    )
  );

create policy "quote_lines_update_owner_or_admin"
  on quote_lines for update to authenticated
  using (
    exists (
      select 1 from quotes q
      where q.id = quote_lines.quote_id
        and (q.owner_id = auth.uid() or is_admin())
    )
  )
  with check (
    exists (
      select 1 from quotes q
      where q.id = quote_lines.quote_id
        and (q.owner_id = auth.uid() or is_admin())
    )
  );

create policy "quote_lines_delete_owner_or_admin"
  on quote_lines for delete to authenticated
  using (
    exists (
      select 1 from quotes q
      where q.id = quote_lines.quote_id
        and (q.owner_id = auth.uid() or is_admin())
    )
  );
-- DELETE is allowed here, unlike quotes/products/components, because line
-- replacement inside fn_save_quote's single transaction is exactly how PRD-014's
-- atomic save is implemented (0008). This is not user-facing deletion of quote
-- history -- quote_status_history captures that instead.

-- ------------------------------------------------------- quote_status_history
create policy "quote_status_history_select_authenticated"
  on quote_status_history for select to authenticated using (true);
-- No INSERT/UPDATE/DELETE policy at all: rows arrive only through the SECURITY
-- DEFINER log_quote_status_*() triggers above. That is what makes the audit
-- trail append-only in the database rather than by convention (NFR-005).
