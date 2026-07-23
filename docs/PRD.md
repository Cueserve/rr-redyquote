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
| PRD-008 | A component whose environment is Indoor-only, used on an Outdoor-environment quote, is flagged as a mismatch. |
| PRD-009 | Component and fab-tier cost dates are compared against settings-configured "warning" and "re-quote" age thresholds and shown as Current / Aging / Re-Quote badges. The quotes dashboard shows a count of stale-priced components. |
| PRD-010 | Quote status lifecycle: `Draft → Pending Approval → Approved → Sent`. Reps can submit a Draft for approval. **Only an admin can transition Pending Approval → Approved, enforced by the database (RLS), not just the UI.** Any signed-in user can mark an Approved quote Sent (flat model). Invalid transitions (e.g. Draft → Approved directly) are rejected. |
| PRD-011 | Quote numbers are generated server-side (format `Q-YYYY-NNNN`, sequential per calendar year) at the moment a quote is first saved — never computed by counting client-side. |
| PRD-012 | A single global settings row holds: labor rate, fabrication markup, component markup (default), cushion %, sales commission %, margin floor %, freshness warning/re-quote thresholds (months). Any signed-in user can edit settings (flat model — matches current intended behavior, not a new restriction). |
| PRD-013 | Branding: an admin-or-any-user (flat) can upload a favicon image; it is resized to 64×64 and applied globally for every user. |
| PRD-014 | Saving a quote and its line items is atomic — either both the quote header and all its lines are written, or neither is. |
| PRD-015 | Saving a product's tiers and default components is atomic, including the price-history rows written for any changed tier cost. |
| PRD-016 | A quote priced below the configured margin floor is flagged (visually and in the submit confirmation) but **is not blocked** from being submitted or saved — advisory only, matching the current app's behavior. |
| PRD-017 | Every quote status transition (Draft/Pending Approval/Approved/Sent) writes an append-only audit row: quote id, from-status, to-status, actor, timestamp. **New in v1** — the current app has no approval audit trail. |

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

## 3. Explicit Non-Requirements (see PRODUCT.md §4)

Multi-tenancy, PDF/email quote delivery, RBAC beyond the one approval gate, and legacy
data migration are out of scope for v1.
