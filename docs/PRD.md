# PRD.md — Testable Requirements

**Owner:** Viral Parikh
**Last updated:** 2026-07-23
**Source of truth for:** the testable functional and non-functional requirements for
RedyQuote v1.

> Derived from: docs/PRODUCT.md
> Downstream: docs/ARCHITECTURE.md, docs/TECH-STACK.md

---

## 1. Functional Requirements

| # | Requirement |
|---|---|
| PRD-001 | Users sign in with email/password via Supabase Auth. No public sign-up; accounts are provisioned by an admin. |
| PRD-002 | On a user's first sign-in, a `profiles` row is created automatically (`full_name` from auth email, `role` defaults to `rep`). |
| PRD-003 | Admins can create/edit/deactivate products: name, SKU, description, vendor, estimated assembly labor hours, active flag. |
| PRD-004 | Each product has one or more quantity-tier fab prices (qty, cost, quoted date, vendor). Changing a tier's cost appends a row to price history. |
| PRD-005 | Each product can have a default component per category, pre-filled when a new quote is started for that product. |
| PRD-006 | The component library supports create/edit/deactivate: category, name, SKU, vendor, environment (Any/Indoor/Outdoor), cost, default labor hours, active flag. Changing a component's cost appends a row to price history. |
| PRD-007 | Quote builder: select product, quantity tier, environment (Indoor/Outdoor); one line per fixed category plus unlimited ad-hoc "misc" lines; live recalculation of hard cost, labor cost, cushion, commission, total cost, MSRP, GP$, GP%, and project totals as inputs change. |
| PRD-007A | Fixed-category invariant: a quote may contain at most one non-misc line per fixed category. Misc lines are exempt and may repeat. The fixed category list MUST be defined before implementation begins. |
| PRD-008 | A component whose environment is Indoor-only, used on an Outdoor-environment quote, is flagged as a mismatch. |
| PRD-009 | Component and fab-tier cost dates are compared against settings-configured "warning" and "re-quote" age thresholds and shown as Current / Aging / Re-Quote badges. The quotes dashboard shows a count of stale-priced components. |
| PRD-010 | Quote status lifecycle: `Draft → Pending Approval → Approved → Sent`. Reps can submit their own Draft for approval. **Only an admin can transition Pending Approval → Approved, enforced by the database (RLS), not just the UI.** The quote's owner or an admin can mark an Approved quote Sent. Invalid transitions (e.g. Draft → Approved directly) are rejected. |
| PRD-011 | Quote numbers are generated server-side (format `Q-YYYY-NNNN`, sequential per calendar year) at the moment a quote is first saved — never computed by counting client-side. |
| PRD-012 | A single global settings row holds: labor rate, fabrication markup, component markup (default), cushion %, sales commission %, margin floor %, freshness warning/re-quote thresholds (months). Editing settings is admin-only, enforced by the database (RLS). Every settings change is audited (see PRD-018A). |
| PRD-013 | Branding: a favicon image can be uploaded, resized to 64×64, and applied globally for every user. Uploading/applying branding is admin-only, enforced by the database (RLS). The change is audited (see PRD-018A). |
| PRD-014 | Saving a quote and its line items is atomic — either both the quote header and all its lines are written, or neither is. |
| PRD-015 | Saving a product's tiers and default components is atomic, including the price-history rows written for any changed tier cost. |
| PRD-016 | A quote priced below the configured margin floor is flagged visually and in the submit confirmation. The flag is advisory only; save and submit remain allowed. |
| PRD-017 | Every quote status transition writes an append-only audit row containing quote_id, from_status, to_status, actor, and changed_at. |
| PRD-018 | Deactivating a product or component is a soft state, not a delete. A deactivated item stays on existing quotes that already reference it (priced as-is, rendered with a visible "Deactivated" badge) but is not selectable for new quote lines on any quote. Deactivated items remain viewable; only admins can edit or reactivate them (PRD-003, PRD-006). |
| PRD-018A | Settings edits (PRD-012) and branding changes (PRD-013) write an append-only audit row (changed field, old value, new value, actor, changed_at) in the same transaction as the change. |
| PRD-019 | Authorization model — admin owns master data. Reps create/manage their own quotes, submit for approval, and mark their own approved quotes Sent; they may read but not write master data. Admins do all of that on any quote, plus the approval gate and all master-data / settings / branding writes. Two roles only (rep, admin). Every write is enforced by Postgres RLS at the database, not only in Server Actions. |

## 2. Non-Functional Requirements

| # | Requirement |
|---|---|
| NFR-001 | Interactive latency feels instant at REDYREF's real scale (a handful of concurrent users, low hundreds of products/components/quotes) — no specific p95/p99 budget is load-bearing at this size. |
| NFR-002 | Access enforcement is database-enforced (Postgres RLS), not client-side only. The one non-flat rule (PRD-010's approval gate) MUST hold even against a bypassed or tampered client. |
| NFR-003 | Credentials are handled entirely by Supabase Auth (GoTrue), bcrypt-hashed, never logged or stored elsewhere. |
| NFR-004 | All traffic is served over TLS; plaintext HTTP is rejected. |
| NFR-005 | Auditability: `price_history` (cost changes) and `quote_status_history` (status changes) are append-only and written in the same transaction as the change they record. |
| NFR-006 | Durability: Point-in-Time Recovery (PITR) is enabled on the Supabase project — this is real, un-recreatable business pricing/quote data. |
| NFR-007 | Server-side is the source of truth for both **access** and **computed pricing values** — a client-submitted cost breakdown is never trusted verbatim; the canonical GP%/total-cost figures are recomputed server-side from stored line items and settings before being persisted or used for the margin-floor flag. |

## 2A. Placeholder Specifications

### Pricing Formula and Rounding Rules

Status: Pending product/pricing sign-off before implementation.

- Inputs to define: fab tier cost, component hard costs, product labor hours, line labor
	hours, labor rate, fabrication markup percent, component markup percent, cushion
	percent, sales commission percent, margin floor percent.
- Calculation order to define: how line totals roll into quote totals, where markups,
	cushion, and commission apply, and how final price each, GP dollars, and GP percent are
	derived.
- Rounding rules to define: whether rounding occurs per line, per quote, per displayed
	amount, or only at final persisted fields.
- Persistence rules to define: which pricing fields are canonical stored values and which
	values are client-preview only.
- Validation fixtures to add: at least five worked examples approved by product and
	pricing stakeholders.

### Real Authorization Model

Status: **Resolved 2026-07-23.** See
`docs/superpowers/specs/2026-07-23-authorization-matrix-design.md`. Codified as PRD-019
(model), PRD-018 (deactivation behavior), and PRD-018A (settings/branding audit).

- Model — **admin owns master data** (PRD-019): reps quote (own quotes, submit, mark own
  Sent) and read master data; admins additionally approve, act on any quote, and own all
  writes to products, fab tiers, product defaults, components, settings, and branding. Two
  roles only.
- Enforcement — every write is Postgres RLS-enforced at the database, not only in Server
  Actions (extends NFR-002 beyond the approval gate).
- Audit — settings and branding changes are audited in an append-only `settings_history`
  table, written in the same transaction as the change (PRD-018A, extends NFR-005).
- Deactivated master data — stays on existing quotes with a "Deactivated" badge, not
  selectable for new lines; admin-only to edit/reactivate (PRD-018).

## 3. Explicit Non-Requirements (see PRODUCT.md §4)

Multi-tenancy, PDF/email quote delivery, RBAC beyond the one approval gate, and legacy
data migration are out of scope for v1.
