# PRD.md — Product Requirements Document

**Owner:** Viral Parikh
**Last updated:** 2026-08-08
**Source of truth for:** the testable functional and non-functional requirements for
RedyQuote v1.

> Derived from: docs/PRODUCT.md
> Downstream: docs/ARCHITECTURE.md, docs/TECH-STACK.md, docs/DESIGN-SYSTEM.md (NFR-008 only)

---

## Contents

1. [Overview](#1-overview)
2. [Target Users](#2-target-users)
3. [Problem Statements](#3-problem-statements)
4. [Features / Capabilities](#4-features--capabilities)
5. [User Stories](#5-user-stories)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
   7A. [Placeholder Specifications](#7a-placeholder-specifications)
8. [Acceptance Criteria](#8-acceptance-criteria)
9. [Out of Scope](#9-out-of-scope)
10. [Dependencies & Assumptions](#10-dependencies--assumptions)
11. [Constraints (Non-Architectural)](#11-constraints-non-architectural)
12. [Risks & Edge Cases](#12-risks--edge-cases)

---

## 1. Overview

_Not yet authored._ See [docs/PRODUCT.md](PRODUCT.md) §1, which carries the problem statement and scope this document turns into testable requirements.

## 2. Target Users

_Not yet authored._ See [docs/PRODUCT.md](PRODUCT.md) §2 — two roles, `rep` and `admin`.

## 3. Problem Statements

_Not yet authored._ See [docs/PRODUCT.md](PRODUCT.md) §1.

## 4. Features / Capabilities

_Not yet authored._ See [docs/PRODUCT.md](PRODUCT.md) §3.

## 5. User Stories

_Not yet authored._ Never authored. Requirements here are stated directly as PRD-NNN rows in §6 rather than as stories; that is a deliberate choice for a single-team internal tool, not an omission to fill in later.

## 6. Functional Requirements

| #        | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PRD-001  | Users sign in with email/password via Supabase Auth. No public sign-up; accounts are provisioned by an admin.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| PRD-001A | Password reset is **out-of-band** for v1: an admin issues a recovery link from the Supabase dashboard. There is no in-app reset flow, no self-service "forgot password" link, and no transactional email provider (TECH-STACK §5 cuts Resend; the authorization-matrix spec §3.4 rules out an in-app user-management screen). This is a scope decision, not a deferred defect — a locked-out rep is an operational task for an admin, so at least one admin must be reachable.                                                                |
| PRD-002  | On a user's first sign-in, a `profiles` row is created automatically (`full_name` from auth email, `role` defaults to `rep`).                                                                                                                                                                                                                                                                                                                                                                                                                 |
| PRD-003  | Admins can create/edit/deactivate products: name, SKU, description, vendor, estimated assembly labor hours, active flag.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| PRD-004  | Each product has one or more fab tiers (qty tier, cost, quoted date, vendor) — see DATABASE.md §2 for what distinguishes a fab tier from its qty tier. Changing a tier's cost appends a row to price history.                                                                                                                                                                                                                                                                                                                                 |
| PRD-005  | Each product can have a default component per category, pre-filled when a new quote is started for that product.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| PRD-006  | The component library supports create/edit/deactivate: category, name, SKU, vendor, environment (Any/Indoor/Outdoor), cost, default labor hours, active flag. Changing a component's cost appends a row to price history.                                                                                                                                                                                                                                                                                                                     |
| PRD-007  | Quote builder: select product, fab tier, environment (Indoor/Outdoor); one line per fixed category plus unlimited ad-hoc "misc" lines; live recalculation of hard cost, labor cost, cushion, commission, total cost, MSRP, GP$, GP%, and project totals as inputs change.                                                                                                                                                                                                                                                                     |
| PRD-007A | Fixed-category invariant: a quote may contain at most one non-misc line per fixed category. Misc lines are exempt and may repeat. The fixed category list MUST be defined before implementation begins. **Open — decider: Viral Parikh (Product Owner), with REDYREF estimating. Unblocked by: the final ordered category names, loaded into `categories` by migration.** Nothing in this repo invents them; the table ships empty.                                                                                                           |
| PRD-008  | A component whose environment is Indoor-only, used on an Outdoor-environment quote, is flagged as a mismatch.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| PRD-009  | Component and fab-tier cost dates are compared against settings-configured "warning" and "re-quote" age thresholds and shown as Current / Aging / Re-quote badges. The quotes dashboard shows a count of stale-priced components.                                                                                                                                                                                                                                                                                                             |
| PRD-010  | Quote status lifecycle: `Draft → Review → Approved → Sent`, plus `Review → Draft` (request changes). Reps can submit their own Draft for approval. **Only an admin can transition out of Review — to Approved or back to Draft — enforced by the database: a `BEFORE UPDATE` trigger, not an RLS policy, because `WITH CHECK` cannot see the old row and so cannot express a transition. Not just the UI.** The quote's owner or an admin can mark an Approved quote Sent. Invalid transitions (e.g. Draft → Approved directly) are rejected. |
| PRD-011  | Quote numbers are generated server-side (format `Q-YYYY-NNNN`, sequential per calendar year) at the moment a quote is first saved — never computed by counting client-side.                                                                                                                                                                                                                                                                                                                                                                   |
| PRD-012  | A single global settings row holds: labor rate, fabrication markup, component markup (default), cushion %, sales commission %, margin floor %, freshness warning/re-quote thresholds (months). Editing settings is admin-only, enforced by the database (RLS). Every settings change is audited (see PRD-018A).                                                                                                                                                                                                                               |
| PRD-013  | Branding: two org-wide assets — a **logo** and a **favicon** — can be uploaded and applied globally for every user. A favicon upload is converted server-side to a multi-resolution ICO (16/32/48/256px) rather than a single fixed size, because the mark has to stay legible in a 16px browser tab. Uploading/applying branding is admin-only, enforced by the database (RLS). The change is audited (see PRD-018A).                                                                                                                        |
| PRD-014  | Saving a quote and its line items is atomic — either both the quote header and all its lines are written, or neither is.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| PRD-015  | Saving a product's tiers and default components is atomic, including the price-history rows written for any changed tier cost.                                                                                                                                                                                                                                                                                                                                                                                                                |
| PRD-016  | A quote priced below the configured margin floor is flagged visually and in the submit confirmation. The flag is advisory only; save and submit remain allowed.                                                                                                                                                                                                                                                                                                                                                                               |
| PRD-017  | Every quote status transition writes an append-only audit row containing quote_id, from_status, to_status, actor, and changed_at.                                                                                                                                                                                                                                                                                                                                                                                                             |
| PRD-018  | Deactivating a product or component is a soft state, not a delete. A deactivated item stays on existing quotes that already reference it (priced as-is, rendered with a visible "Deactivated" badge) but is not selectable for new quote lines on any quote. Deactivated items remain viewable; only admins can edit or reactivate them (PRD-003, PRD-006).                                                                                                                                                                                   |
| PRD-018A | Settings edits (PRD-012) and branding changes (PRD-013) write an append-only audit row (changed field, old value, new value, actor, changed_at) in the same transaction as the change.                                                                                                                                                                                                                                                                                                                                                        |
| PRD-018B | The settings screen shows the `settings_history` audit trail (changed field, old value, new value, actor, timestamp), newest first. **Read access is admin-only** — unlike every other read in the system, which is flat (PRD-019). Markup, commission, and margin-floor history is compensation-adjacent, and the flat-read default was never a decision. Enforced by RLS, not by hiding the tab.                                                                                                                                            |
| PRD-019  | Authorization model — admin owns master data. Reps create/manage their own quotes, submit for approval, and mark their own approved quotes Sent; they may read but not write master data. Admins do all of that on any quote, plus the approval gate and all master-data / settings / branding writes. Two roles only (rep, admin). Every write is enforced by Postgres RLS at the database, not only in Server Actions. Reads are flat, with one exception: `settings_history` (PRD-018B).                                                   |
| PRD-020  | A write rejected by the database — the approval gate (PRD-010), an invalid status transition, an admin-only write (PRD-019), the fixed-category invariant (PRD-007A), or a row the caller may not touch — surfaces a specific, factual message naming what was refused and why. Never a raw Postgres exception string, and never a generic "something went wrong": the database is the authorization boundary, so its refusals are information the user needs, not noise to swallow. Copy follows DESIGN-SYSTEM §11.                          |

## 7. Non-Functional Requirements

| #       | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-001 | Interactive latency feels instant at REDYREF's real scale (a handful of concurrent users, low hundreds of products/components/quotes) — no specific p95/p99 budget is load-bearing at this size.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| NFR-002 | Access enforcement is database-enforced (Postgres RLS), not client-side only. The non-flat lifecycle rules (PRD-010's admin-only review-stage transitions) MUST hold even against a bypassed or tampered client.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| NFR-003 | Credentials are handled entirely by Supabase Auth (GoTrue), bcrypt-hashed, never logged or stored elsewhere.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| NFR-004 | All traffic is served over TLS; plaintext HTTP is rejected.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| NFR-005 | Auditability: `price_history` (cost changes) and `quote_status_history` (status changes) are append-only and written in the same transaction as the change they record.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| NFR-006 | Durability, **phased by environment** — quote and pricing data is real and un-recreatable, but the protection required scales with whether that data exists yet. **(a) Development / pre-production (current):** Supabase **Free** tier; no automated backups exist on Free, and none are required, because the database holds only seed and test data. Take a `supabase db dump` before any destructive migration. **(b) Production cutover — the trigger is the first real customer quote being stored:** the project MUST be on **Pro** ($25/mo), whose included daily backups (7-day retention) are the accepted recovery mechanism for v1. **(c) PITR is explicitly NOT required for v1** — it is a $100/mo add-on that replaces daily backups with finer granularity, and a sub-24-hour RPO is not justified at REDYREF's scale. Revisit only if a stated RPO ever drops below 24 hours. |
| NFR-007 | Server-side is the source of truth for both **access** and **computed pricing values** — a client-submitted cost breakdown is never trusted verbatim; the canonical GP%/total-cost figures are recomputed server-side from stored line items and settings before being persisted or used for the margin-floor flag.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| NFR-008 | **Supported viewports are tablet and up (≥768px CSS width).** Every screen MUST be usable at 768px and above with no horizontal scrolling of the page itself; a dense table MAY scroll horizontally inside its own container, which is the designed behaviour and not a defect. Phone widths are out of scope (§3): nothing below 768px is designed or tested, and the app is not expected to degrade gracefully there. The navigation rail's two-width collapse, and the measurement rule that fixes its breakpoint, are specified in [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) §9.                                                                                                                                                                                                                                                                                                                |

## 7A. Placeholder Specifications

### Pricing Formula and Rounding Rules

Status: **Open.** Decider: **Viral Parikh (Product Owner), with REDYREF sales and
estimating.** Unblocked by: the five worked examples below, signed off in writing and
committed as fixtures under `src/lib/pricing/`.

- Inputs to define: fab tier cost, component hard costs, product labor hours, line labor
  hours, labor rate, fabrication markup percent, component markup percent, cushion
  percent, sales commission percent, margin floor percent.
- Calculation order to define: how line totals roll into quote totals, where markups,
  cushion, and commission apply, and how final price each, GP dollars, and GP percent are
  derived — and whether **MSRP** (named as a live-recalc output in PRD-007 and PRODUCT §3,
  but absent from this list and from the `quotes` columns) is a display alias for
  `final_price_each` or a distinct list price needing its own persisted column.
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

## 8. Acceptance Criteria

_Not yet authored._ Acceptance is currently expressed inline: each PRD-NNN row in §6 states its
own testable condition. A separate criteria table would duplicate them and drift. If one is ever
added, it replaces the inline statements rather than sitting alongside them.

## 9. Out of Scope

Multi-tenancy, PDF/email quote delivery, RBAC beyond the two-role rep/admin model
(PRD-019), and legacy data migration are out of scope for v1.

**Phone-width support is also out of scope** (NFR-008). Reps quote from a desk or a tablet,
and the screens are dense tables and multi-column forms that a 390px viewport cannot carry
without a separate design. Nothing below 768px is designed or tested. This is a scope
decision, not a deferred defect — treat a phone-width bug report as a request to widen scope.

## 10. Dependencies & Assumptions

_Not yet authored._ No external integrations exist in v1 (docs/ARCHITECTURE.md §6). The only standing dependency is the Supabase platform.

## 11. Constraints (Non-Architectural)

_Not yet authored._

## 12. Risks & Edge Cases

_Not yet authored._
