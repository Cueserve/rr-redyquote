# DATABASE.md — Data Model

**Owner:** Viral Parikh
**Last updated:** 2026-08-01
**Source of truth for:** RedyQuote's entities, their columns and constraints, and the
design decisions behind why each table looks the way it does.

> Derived from: docs/PRD.md, docs/ARCHITECTURE.md, docs/PRODUCT.md, docs/TECH-STACK.md
> Downstream: `docs/DATABASE-SQL.md`,
> `src/lib/supabase/types.ts`

**This file describes the model, not the DDL.** The SQL that implements it — `CREATE TABLE`
statements, triggers, RPC functions, and RLS policies — lives in the implementation spec
listed above, which `supabase/migrations/*.sql` consumes and which is deleted once those
migrations are authored.

The split exists so this file can be permanent. ARCHITECTURE.md §5 is unaffected by it:
**the migration files are the authoritative schema.** Keeping the DDL here too would mean
two copies of the same SQL, each free to drift from the other — which is the exact failure
that rule was written to prevent. Column tables below stay because they describe the model
a reader needs; they are not a second implementation of it.

---

## Contents

1. [System Summary](#1-system-summary)
2. [Entity List](#2-entity-list)
3. [ERD](#3-erd)
4. [Table Definitions](#4-table-definitions)
5. [Design Decisions](#5-design-decisions)
6. [Open Items](#6-open-items)

---

## 1. System Summary

RedyQuote is a **single-tenant** quoting system for REDYREF's sales team. Two roles only —
**rep** and **admin** — sit on top of Supabase Auth. Admins own the product catalog,
component library, quantity-tier fab pricing, global estimating settings, and branding.
Reps build quotes against that catalog; every quote moves through a fixed
`Draft → Pending Approval → Approved → Sent` lifecycle plus an explicit
`Pending Approval → Draft` request-changes path, with the
`Pending Approval → Approved` and `Pending Approval → Draft` steps and all master-data writes **enforced by Postgres RLS**,
not application code (PRD-019, NFR-002).

Three structural guarantees drove this design, matching PRD's stated anti-patterns:

1. **Race-free quote numbering** (PRD-011) — a per-year counter table, incremented with a
   single atomic `INSERT ... ON CONFLICT DO UPDATE`, not client-side counting.
2. **Atomic multi-row writes** (PRD-014, PRD-015) — quote header + lines, and product +
   fab tiers + defaults + price history, are each written inside one `SECURITY INVOKER`
   Postgres function (RPC) so a partial failure can never leave a quote or product
   half-written.
3. **A single canonical cost breakdown** (NFR-007) — the schema stores the
   _server-recomputed_ pricing outputs on `quotes`/`quote_lines`; it does not encode a
   pricing formula. **The formula itself is an open PRD §2A placeholder** — see §5.1.

Everything else follows standard 3NF normalization, `uuid` primary keys, and audit trails
that are append-only at the database level (not just by application convention).

---

## 2. Entity List

| #   | Table                    | Role                                                                                                   |
| --- | ------------------------ | ------------------------------------------------------------------------------------------------------ |
| 1   | `profiles`               | Extends `auth.users` 1:1 — full name, role (`rep`/`admin`)                                             |
| 2   | `categories`             | Lookup for the fixed quote-line categories (PRD-007A)                                                  |
| 3   | `settings`               | Singleton row — labor rate, markups, cushion/commission %, margin floor, freshness thresholds, favicon |
| 4   | `settings_history`       | Append-only audit of `settings` field changes (PRD-018A)                                               |
| 5   | `products`               | Fabricated product catalog                                                                             |
| 6   | `fab_tiers`              | Quantity-tier fab cost per product                                                                     |
| 7   | `product_defaults`       | Default component per category per product                                                             |
| 8   | `components`             | Component library (category, environment, cost, labor hours)                                           |
| 9   | `price_history`          | Append-only cost history for components and fab tiers                                                  |
| 10  | `quote_number_sequences` | Internal counter backing race-free `Q-YYYY-NNNN` numbering                                             |
| 11  | `quotes`                 | Quote header + server-computed cost breakdown + lifecycle status                                       |
| 12  | `quote_lines`            | Quote line items (one per fixed category + unlimited misc)                                             |
| 13  | `quote_status_history`   | Append-only audit of quote status transitions (PRD-017)                                                |

**Two tables not named in ARCHITECTURE.md's data-design table** were added to close gaps
left open by the source docs — see §5.2 for the rationale on each (`categories`,
`quote_number_sequences`).

---

## 3. ERD

```mermaid
erDiagram
    PROFILES ||--o{ QUOTES : owns
    PROFILES ||--o{ QUOTES : approves
    PROFILES ||--o{ QUOTE_STATUS_HISTORY : "acted as"
    PROFILES ||--o{ SETTINGS_HISTORY : "acted as"
    PROFILES ||--o{ PRICE_HISTORY : "changed by"

    CATEGORIES ||--o{ COMPONENTS : classifies
    CATEGORIES ||--o{ PRODUCT_DEFAULTS : classifies
    CATEGORIES ||--o{ QUOTE_LINES : classifies

    PRODUCTS ||--o{ FAB_TIERS : has
    PRODUCTS ||--o{ PRODUCT_DEFAULTS : has
    PRODUCTS ||--o{ QUOTES : "quoted for"
    PRODUCTS ||--o{ PRICE_HISTORY : "fab cost history"

    FAB_TIERS ||--o{ QUOTES : "tier selected"

    COMPONENTS ||--o{ PRODUCT_DEFAULTS : "default for"
    COMPONENTS ||--o{ QUOTE_LINES : "used on"
    COMPONENTS ||--o{ PRICE_HISTORY : "component cost history"

    QUOTES ||--o{ QUOTE_LINES : contains
    QUOTES ||--o{ QUOTE_STATUS_HISTORY : logs

    SETTINGS ||--o{ SETTINGS_HISTORY : logs

    PROFILES {
        uuid id PK
        text full_name
        user_role role
    }
    CATEGORIES {
        uuid id PK
        text name
        boolean is_active
    }
    SETTINGS {
        boolean id PK
        numeric labor_rate
        numeric fab_markup_percent
        numeric component_markup_percent
        numeric cushion_percent
        numeric commission_percent
        numeric margin_floor_percent
        smallint freshness_warning_months
        smallint freshness_requote_months
        text favicon_url
    }
    PRODUCTS {
        uuid id PK
        text name
        text sku UK
        boolean active
    }
    FAB_TIERS {
        uuid id PK
        uuid product_id FK
        int qty_tier
        numeric cost
        date quoted_date
    }
    PRODUCT_DEFAULTS {
        uuid id PK
        uuid product_id FK
        uuid category_id FK
        uuid component_id FK
    }
    COMPONENTS {
        uuid id PK
        uuid category_id FK
        text name
        text sku UK
        environment_type environment
        numeric cost
        boolean active
    }
    PRICE_HISTORY {
        uuid id PK
        text source_type
        uuid component_id FK
        uuid product_id FK
        int qty_tier
        numeric cost
        uuid changed_by FK
    }
    QUOTES {
        uuid id PK
        text quote_number UK
        uuid product_id FK
        uuid fab_tier_id FK
        quote_environment environment
        quote_status status
        uuid owner_id FK
        uuid approved_by FK
        numeric final_price_each
        numeric gp_percent
    }
    QUOTE_LINES {
        uuid id PK
        uuid quote_id FK
        uuid category_id FK
        uuid component_id FK
        boolean is_misc
        numeric hard_cost
    }
    QUOTE_STATUS_HISTORY {
        uuid id PK
        uuid quote_id FK
        text from_status
        text to_status
        uuid actor FK
    }
    SETTINGS_HISTORY {
        uuid id PK
        text changed_field
        uuid actor FK
    }
```

---

## 4. Table Definitions

Design conventions applied throughout:

- `uuid` primary keys via `gen_random_uuid()` (`pgcrypto`), except `settings` (boolean
  singleton PK) and `quote_number_sequences` (natural `year` PK — an internal counter, not
  a public entity).
- `created_at` / `updated_at` (`timestamptz`) on every mutable table; `updated_at`
  maintained by a shared trigger.
- **No `deleted_at` soft-delete column anywhere.** PRD-018 already defines the product's
  soft-delete equivalent as a domain-specific `active` boolean on `products`/`components`
  — an item stays fully visible and joinable (unlike a conventional hidden soft-delete
  row), just not selectable for _new_ quote lines. Every other table either forbids delete
  outright (append-only audit tables, `quotes`) or has no deletion requirement at all. See
  §5.3 for the full rationale.
- Every FK column is explicitly indexed (Postgres does not do this automatically).
- RLS is enabled on **every** table (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`), per
  ARCHITECTURE §1/§7.

### 4.1 `profiles`

1:1 extension of `auth.users` (PRD-001, PRD-002). Populated automatically by a trigger on
`auth.users` insert.

| Column       | Type          | Constraints                                 |
| ------------ | ------------- | ------------------------------------------- |
| `id`         | `uuid`        | PK, FK → `auth.users(id)` ON DELETE CASCADE |
| `full_name`  | `text`        | NOT NULL                                    |
| `role`       | `user_role`   | NOT NULL, DEFAULT `'rep'`                   |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()`                   |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()`                   |

### 4.2 `categories`

Backs the **fixed quote-line categories** from PRD-007A. The actual list of names is a
product decision still pending in the source docs ("MUST be defined before implementation
begins") — modeling it as a table rather than a hardcoded enum lets that list be populated
and edited by migration/admin UI without a schema change once it's finalized.

| Column                      | Type          | Constraints                     |
| --------------------------- | ------------- | ------------------------------- |
| `id`                        | `uuid`        | PK, DEFAULT `gen_random_uuid()` |
| `name`                      | `text`        | NOT NULL, UNIQUE                |
| `is_active`                 | `boolean`     | NOT NULL, DEFAULT `true`        |
| `sort_order`                | `integer`     | NOT NULL, DEFAULT `0`           |
| `created_at` / `updated_at` | `timestamptz` | NOT NULL                        |

### 4.3 `settings`

Singleton row (PRD-012). Enforced as exactly one row via a `boolean` primary key with a
`CHECK (id)` constraint — a well-known Postgres singleton pattern (the PK's uniqueness
does the enforcement; the `CHECK` forbids the row ever being `false`).

| Column                      | Type            | Constraints                                  |
| --------------------------- | --------------- | -------------------------------------------- |
| `id`                        | `boolean`       | PK, DEFAULT `true`, CHECK (`id`)             |
| `labor_rate`                | `numeric(10,2)` | NOT NULL, CHECK `>= 0`                       |
| `fab_markup_percent`        | `numeric(5,2)`  | NOT NULL, CHECK `>= 0`                       |
| `component_markup_percent`  | `numeric(5,2)`  | NOT NULL, CHECK `>= 0`                       |
| `cushion_percent`           | `numeric(5,2)`  | NOT NULL, CHECK `>= 0`                       |
| `commission_percent`        | `numeric(5,2)`  | NOT NULL, CHECK `>= 0`                       |
| `margin_floor_percent`      | `numeric(5,2)`  | NOT NULL, CHECK `>= 0`                       |
| `freshness_warning_months`  | `smallint`      | NOT NULL, CHECK `>= 1`                       |
| `freshness_requote_months`  | `smallint`      | NOT NULL, CHECK `> freshness_warning_months` |
| `favicon_url`               | `text`          | NULL                                         |
| `updated_by`                | `uuid`          | FK → `profiles(id)`                          |
| `created_at` / `updated_at` | `timestamptz`   | NOT NULL                                     |

**Every rate on this row is a percent** — the two markups are stored as `50.00` / `20.00`,
not as the `1.50` / `1.20` multipliers that say the same thing. A multiplier in
`numeric(5,2)` can only step 0.01, which is one whole percentage point of markup; as a
percent the same type is 100× finer. `quote_lines.markup_percent` carries the same unit,
so the component markup pre-fills a new line with no conversion anywhere. The rationale is
recorded in full in `supabase/migrations/0004_settings_markup_units.sql`, which renamed
these two columns after `0003_settings.sql` had already shipped them as `*_multiplier`.

### 4.4 `settings_history`

Append-only (PRD-018A, NFR-005). One row per changed field, written by a trigger in the
same transaction as the `settings` update — never insertable directly by a client (see [SQL spec §3](DATABASE-SQL.md#3-rls-policies)).

| Column          | Type          | Constraints                   |
| --------------- | ------------- | ----------------------------- |
| `id`            | `uuid`        | PK                            |
| `changed_field` | `text`        | NOT NULL                      |
| `old_value`     | `text`        | NULL                          |
| `new_value`     | `text`        | NULL                          |
| `actor`         | `uuid`        | NOT NULL, FK → `profiles(id)` |
| `changed_at`    | `timestamptz` | NOT NULL, DEFAULT `now()`     |

### 4.5 `products`

| Column                      | Type           | Constraints                         |
| --------------------------- | -------------- | ----------------------------------- |
| `id`                        | `uuid`         | PK                                  |
| `name`                      | `text`         | NOT NULL                            |
| `sku`                       | `text`         | NOT NULL, UNIQUE                    |
| `description`               | `text`         | NULL                                |
| `vendor`                    | `text`         | NULL                                |
| `est_labor_hours`           | `numeric(6,2)` | NOT NULL, DEFAULT `0`, CHECK `>= 0` |
| `active`                    | `boolean`      | NOT NULL, DEFAULT `true`            |
| `created_at` / `updated_at` | `timestamptz`  | NOT NULL                            |

### 4.6 `fab_tiers`

Quantity-tier fab pricing (PRD-004). One live row per `(product_id, qty_tier)`; changes to
`cost` append a `price_history` row via trigger.

| Column                      | Type            | Constraints                                     |
| --------------------------- | --------------- | ----------------------------------------------- |
| `id`                        | `uuid`          | PK                                              |
| `product_id`                | `uuid`          | NOT NULL, FK → `products(id)` ON DELETE CASCADE |
| `qty_tier`                  | `integer`       | NOT NULL, CHECK `> 0`                           |
| `cost`                      | `numeric(12,2)` | NOT NULL, CHECK `>= 0`                          |
| `quoted_date`               | `date`          | NOT NULL                                        |
| `vendor`                    | `text`          | NULL                                            |
| `created_at` / `updated_at` | `timestamptz`   | NOT NULL                                        |
| —                           | —               | UNIQUE `(product_id, qty_tier)`                 |

### 4.7 `product_defaults`

Default component per category per product (PRD-005).

| Column                      | Type          | Constraints                                     |
| --------------------------- | ------------- | ----------------------------------------------- |
| `id`                        | `uuid`        | PK                                              |
| `product_id`                | `uuid`        | NOT NULL, FK → `products(id)` ON DELETE CASCADE |
| `category_id`               | `uuid`        | NOT NULL, FK → `categories(id)`                 |
| `component_id`              | `uuid`        | NOT NULL, FK → `components(id)`                 |
| `created_at` / `updated_at` | `timestamptz` | NOT NULL                                        |
| —                           | —             | UNIQUE `(product_id, category_id)`              |

### 4.8 `components`

Component library (PRD-006).

| Column                      | Type               | Constraints                         |
| --------------------------- | ------------------ | ----------------------------------- |
| `id`                        | `uuid`             | PK                                  |
| `category_id`               | `uuid`             | NOT NULL, FK → `categories(id)`     |
| `name`                      | `text`             | NOT NULL                            |
| `sku`                       | `text`             | NOT NULL, UNIQUE                    |
| `vendor`                    | `text`             | NULL                                |
| `environment`               | `environment_type` | NOT NULL, DEFAULT `'any'`           |
| `cost`                      | `numeric(12,2)`    | NOT NULL, CHECK `>= 0`              |
| `default_labor_hours`       | `numeric(6,2)`     | NOT NULL, DEFAULT `0`, CHECK `>= 0` |
| `active`                    | `boolean`          | NOT NULL, DEFAULT `true`            |
| `created_at` / `updated_at` | `timestamptz`      | NOT NULL                            |

### 4.9 `price_history`

Append-only cost history for **either** a component **or** a fab tier (discriminated by
`source_type`), written automatically by triggers whenever `components.cost` or
`fab_tiers.cost` changes (NFR-005). Modeled as one table (matching ARCHITECTURE.md's data
design table) with a `CHECK` constraint enforcing exactly one relation is populated,
rather than two separate tables — see §5.4 for the trade-off.

| Column         | Type            | Constraints                                                  |
| -------------- | --------------- | ------------------------------------------------------------ |
| `id`           | `uuid`          | PK                                                           |
| `source_type`  | `text`          | NOT NULL, CHECK IN (`'component'`,`'fab_tier'`)              |
| `component_id` | `uuid`          | FK → `components(id)`, NULL unless `source_type='component'` |
| `product_id`   | `uuid`          | FK → `products(id)`, NULL unless `source_type='fab_tier'`    |
| `qty_tier`     | `integer`       | NULL unless `source_type='fab_tier'`                         |
| `cost`         | `numeric(12,2)` | NOT NULL                                                     |
| `quoted_date`  | `date`          | NOT NULL                                                     |
| `vendor`       | `text`          | NULL                                                         |
| `changed_by`   | `uuid`          | NOT NULL, FK → `profiles(id)`                                |
| `created_at`   | `timestamptz`   | NOT NULL, DEFAULT `now()`                                    |

### 4.10 `quote_number_sequences`

Internal bookkeeping only — never read or written directly by application code, only by
`fn_save_quote` ([SQL spec §2](DATABASE-SQL.md#2-rpc-functions-atomic-multi-row-writes)). Backs PRD-011's race-free `Q-YYYY-NNNN` numbering.

| Column        | Type       | Constraints           |
| ------------- | ---------- | --------------------- |
| `year`        | `smallint` | PK                    |
| `last_number` | `integer`  | NOT NULL, DEFAULT `0` |

### 4.11 `quotes`

Quote header, server-computed cost breakdown, and lifecycle status (PRD-007, PRD-010,
PRD-011). `fab_cost_snapshot` and every `quote_lines.hard_cost` capture the cost **as of
the save**, so a later fab-tier or component price change never silently drifts a
previously saved quote — the historical basis is preserved, matching the "one consistent
formula, agreeing every time" requirement.

| Column                      | Type                | Constraints                                              |
| --------------------------- | ------------------- | -------------------------------------------------------- |
| `id`                        | `uuid`              | PK                                                       |
| `quote_number`              | `text`              | NOT NULL, UNIQUE — format `Q-YYYY-NNNN`                  |
| `customer_name`             | `text`              | NOT NULL                                                 |
| `product_id`                | `uuid`              | NOT NULL, FK → `products(id)`                            |
| `fab_tier_id`               | `uuid`              | NOT NULL, FK → `fab_tiers(id)`                           |
| `fab_cost_snapshot`         | `numeric(12,2)`     | NOT NULL — fab cost captured at save time                |
| `environment`               | `quote_environment` | NOT NULL                                                 |
| `status`                    | `quote_status`      | NOT NULL, DEFAULT `'draft'`                              |
| `owner_id`                  | `uuid`              | NOT NULL, FK → `profiles(id)`                            |
| `approved_by`               | `uuid`              | FK → `profiles(id)`, NULL until approved                 |
| `submitted_at`              | `timestamptz`       | NULL                                                     |
| `approved_at`               | `timestamptz`       | NULL                                                     |
| `sent_at`                   | `timestamptz`       | NULL                                                     |
| `total_hard_cost`           | `numeric(12,2)`     | NOT NULL, DEFAULT `0`                                    |
| `total_labor_cost`          | `numeric(12,2)`     | NOT NULL, DEFAULT `0`                                    |
| `cushion_amount`            | `numeric(12,2)`     | NOT NULL, DEFAULT `0`                                    |
| `commission_amount`         | `numeric(12,2)`     | NOT NULL, DEFAULT `0`                                    |
| `total_cost`                | `numeric(12,2)`     | NOT NULL, DEFAULT `0`                                    |
| `final_price_each`          | `numeric(12,2)`     | NOT NULL, DEFAULT `0`                                    |
| `gp_dollars`                | `numeric(12,2)`     | NOT NULL, DEFAULT `0`                                    |
| `gp_percent`                | `numeric(6,3)`      | NOT NULL, DEFAULT `0`                                    |
| `below_margin_floor`        | `boolean`           | NOT NULL, DEFAULT `false` — advisory flag only (PRD-016) |
| `created_at` / `updated_at` | `timestamptz`       | NOT NULL                                                 |

> **The nine pricing columns above are storage for server-recomputed _outputs_, not an
> implementation of the formula.** The formula that produces them is PRD §2A's open
> placeholder — see §5.1.

### 4.12 `quote_lines`

One line per fixed category, plus unlimited ad-hoc misc lines (PRD-007, PRD-007A).

| Column                      | Type            | Constraints                                                                          |
| --------------------------- | --------------- | ------------------------------------------------------------------------------------ |
| `id`                        | `uuid`          | PK                                                                                   |
| `quote_id`                  | `uuid`          | NOT NULL, FK → `quotes(id)` ON DELETE CASCADE                                        |
| `category_id`               | `uuid`          | FK → `categories(id)`, required unless `is_misc`                                     |
| `component_id`              | `uuid`          | FK → `components(id)`, NULL for misc / custom lines                                  |
| `description`               | `text`          | NOT NULL                                                                             |
| `is_misc`                   | `boolean`       | NOT NULL, DEFAULT `false`                                                            |
| `hard_cost`                 | `numeric(12,2)` | NOT NULL, DEFAULT `0` — snapshotted at save                                          |
| `labor_hours`               | `numeric(6,2)`  | NOT NULL, DEFAULT `0`                                                                |
| `labor_cost`                | `numeric(12,2)` | NOT NULL, DEFAULT `0` — snapshotted at save                                          |
| `markup_percent`            | `numeric(5,2)`  | NOT NULL, DEFAULT `0`                                                                |
| `environment_mismatch`      | `boolean`       | NOT NULL, DEFAULT `false` (PRD-008)                                                  |
| `sort_order`                | `integer`       | NOT NULL, DEFAULT `0`                                                                |
| `created_at` / `updated_at` | `timestamptz`   | NOT NULL                                                                             |
| —                           | —               | CHECK (`is_misc` OR `category_id IS NOT NULL`)                                       |
| —                           | —               | UNIQUE partial index `(quote_id, category_id) WHERE NOT is_misc` — enforces PRD-007A |

### 4.13 `quote_status_history`

Append-only (PRD-017, NFR-005). Written by an `AFTER UPDATE` trigger on `quotes`, in the
same transaction as the status change — never insertable directly by a client (see [SQL spec §3](DATABASE-SQL.md#3-rls-policies)).

| Column        | Type          | Constraints                                   |
| ------------- | ------------- | --------------------------------------------- |
| `id`          | `uuid`        | PK                                            |
| `quote_id`    | `uuid`        | NOT NULL, FK → `quotes(id)` ON DELETE CASCADE |
| `from_status` | `text`        | NULL (NULL on the initial Draft insert)       |
| `to_status`   | `text`        | NOT NULL                                      |
| `actor`       | `uuid`        | NOT NULL, FK → `profiles(id)`                 |
| `changed_at`  | `timestamptz` | NOT NULL, DEFAULT `now()`                     |

---

## 5. Design Decisions

Why the model looks like this. Each of these was a fork in the road; recording the reasoning
is what stops it being re-litigated from scratch, or quietly reversed.

### 5.1 Pricing columns are storage, not a formula

PRD §2A states the pricing formula and rounding rules are "pending product/pricing sign-off"
and that "no implementation may invent or infer calculation order, rounding points, or
persisted pricing fields" ahead of that.

This model takes the narrowest reading consistent with being useful today: it defines
_storage_ for the nine output values ARCHITECTURE.md's data-design table already names
(`total_hard_cost`, `gp_percent`, `final_price_each`, and the rest) as plain `numeric`
columns with **no formula, trigger, or generated-column logic behind them**. The server
recomputes those values and writes them (NFR-007); the database only holds them.

Consequence, carried in [§6](#6-open-items): the save RPC must not be wired into a real
Server Action until PRD §2A is signed off.

### 5.2 Two tables exist beyond ARCHITECTURE.md's data-design table

- **`categories`** — PRD-007A's fixed-category list is explicitly "MUST be defined before
  implementation begins" and appears in no source doc. Modeling it as a lookup table rather
  than a hardcoded Postgres enum means the list can be entered as data once decided, with no
  schema migration, and gives `components.category_id` and `quote_lines.category_id` real
  referential integrity instead of a free-text column. Nothing here invents the categories
  themselves — see [§6](#6-open-items).
- **`quote_number_sequences`** — a pure implementation detail behind PRD-011, never exposed
  to a client. It is what lets the save RPC allocate a number with a single
  `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` instead of an explicit
  `SELECT ... FOR UPDATE` lock, which is what makes PRD-011's race-freedom structural rather
  than careful.

### 5.3 No `deleted_at` anywhere

Every table was checked against the question rather than the column being added by reflex.

`products` and `components` already carry a domain-specific soft state — `active` (PRD-018)
— that behaves **unlike** a conventional soft-delete: deactivated rows stay fully visible
and joinable everywhere, including on quotes that already reference them, rather than being
filtered out by default. Layering a generic `deleted_at` on top would be redundant with
`active` and would invite two different "is this gone?" checks to drift apart.

Every other table either forbids deletion outright via RLS (`quotes`, the audit tables) or
has no deletion requirement in the source docs at all.

### 5.4 `price_history` is one polymorphic table, not two

ARCHITECTURE.md's data-design table names a single `price_history` covering both component
costs and fab-tier costs, so this model follows it rather than splitting into
`component_price_history` / `fab_tier_price_history`.

The trade-off is real and worth stating: the single-table version needs the `source_type`
discriminator plus a `CHECK` constraint to stop the two row shapes mixing, where two tables
would get that for free from their own `NOT NULL` constraints — at the cost of duplicated
DDL and query logic.

If price-history reporting ever grows query needs specific to one source type, splitting is
a clean, low-risk migration later: nothing references `price_history` by name outside the
two logging triggers.

---

## 6. Open Items

Unresolved questions this model deliberately does not answer. Each is a product decision,
not missing work — resolving one is a change to the doc that owns it, not a change here
alone.

| Item                                 | Blocks                                                     | Owner decision needed                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Pricing formula** (PRD §2A)        | Wiring the save RPC into a real Server Action              | Calculation order, rounding points, and which fields are canonical vs. preview-only. On sign-off, confirm the nine columns on `quotes` still match that field list and reconcile if not.                                                                                                                                                                                                                                 |
| **Fixed-category list** (PRD-007A)   | Populating `categories`; the quote builder's row structure | REDYREF's actual category names. The table ships empty — nothing in this repo invents them.                                                                                                                                                                                                                                                                                                                              |
| **Editing a quote after submission** | Whether `quote_lines` freezes outside `Draft`              | Neither PRD.md nor ARCHITECTURE.md says whether a rep may still edit line items once a quote leaves `Draft` — only that _status transitions_ follow the fixed state machine. This model allows content edits at any status by owner-or-admin. If the real process expects a submitted quote's lines to be frozen, that is a trigger, and it should be a deliberate decision rather than an assumption baked in silently. |

One further item is an implementation risk rather than a product decision, and is tracked in
the SQL spec: the `profiles` update policy permits a user to set `role = 'admin'` on their
own row, which needs a companion trigger before go-live.
