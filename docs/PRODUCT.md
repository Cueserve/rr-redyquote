# PRODUCT.md — Product Concept

**Owner:** Viral Parikh (Product Owner)
**Last updated:** 2026-07-23
**Source of truth for:** the problem RedyQuote solves, who it's for, and what "done" means
for v1 — REDYREF's new sales quoting system.

> Derived from: (none — starting point)
> Downstream: README.md, docs/PRD.md, docs/BACKLOG.md

---

## 1. Overview

### Vision

A quoting system REDYREF's sales team can trust — with consistent pricing, enforced approvals, and no silent quote loss, corruption, or duplication.

### Problem Statement

REDYREF (self-service digital kiosk manufacturer) prices and quotes every kiosk deal by
hand, rep by rep, with no shared system enforcing consistency or accountability. As sales
volume grows, that has to be backed by software the team can trust — specifically:

- **Access control** — approving a quote must be a real, enforced permission, not just a
  UI convention. Any signed-in rep must be structurally unable to approve their own quote.
- **Reliable saves** — a quote's line items must be written atomically. A partial failure
  mid-save must never leave a quote with missing or duplicated lines.
- **Race-free quote numbering** — two reps saving new quotes at the same moment must never
  receive the same quote number.
- **One consistent pricing formula** — the price shown to the customer and the cost basis
  the margin percentage is computed against must always agree; there's no room for two
  formulas quietly drifting apart.
- **An audit trail** — every approval and every status change must record who did it and
  when, so quote history is never a guess.

### Objective

RedyQuote must let REDYREF's sales team quote with confidence: every quote priced by one
consistent formula, numbered without collisions, saved without loss, and approved only by
the right person — with a full record of who did what, and when.

### Description

RedyQuote is REDYREF's quoting system. Admins maintain a product catalog with quantity-tier fab pricing and a component library (with full price history); reps build a quote against a product, its quantity tier, and its components, one line per category plus unlimited ad-hoc lines, with hard cost, labor cost, cushion, commission, margin, and totals recalculating live as they go. Every quote moves through
Draft → Pending Approval → Approved → Sent — the approval step enforced by the database
(RLS), not the UI — and every status change is written to an audit trail.

## 2. Target Users

Single organization: **REDYREF**, single tenant, no reselling to other clients planned.

- **Sales reps** — build and submit quotes.
- **Admins** — everything a rep can do, plus approve quotes. This is the only role
  distinction enforced; access is otherwise flat (any signed-in user can read/write
  products, components, and settings).

## 3. Features

- **Product catalog** — products with quantity-tier fab pricing (cost, quoted date,
  vendor per tier) and a default component per category.
- **Component library** — reusable components by category, name, vendor, and environment
  (Any/Indoor/Outdoor), with full price history on every cost change.
- **Quote builder** — select a product, tier, and environment; live recalculation of hard
  cost, labor cost, cushion, commission, total cost, MSRP, GP$, GP%, and project totals as
  a rep edits lines, with Indoor/Outdoor component mismatches flagged.
- **Price freshness tracking** — component and fab-tier cost dates compared against
  configurable warning/re-quote age thresholds, shown as Current/Aging/Re-Quote badges.
- **Approval lifecycle** — Draft → Pending Approval → Approved → Sent; the
  Pending Approval → Approved transition is admin-only and enforced by the database, not
  just the UI; every transition writes an audit row (who, when, from/to status).
- **Estimating defaults** — a single global settings row for labor rate, fab/component
  markup, cushion %, sales commission %, margin floor %, and freshness thresholds.
- **Branding** — an org-wide favicon/logo, applied globally.

## 4. Scope (In / Out)

### In scope

- Core quoting workflow: products, quantity-tier fab pricing, component library with price
  history, quote builder with live cost/margin calculation, submit → approve → sent
  lifecycle, estimating defaults, branding.
- Building in the five requirements above: real access control on approval, atomic
  multi-row writes, race-free quote numbering, a single consistent cushion/margin formula,
  and an audit trail of status changes.

### Out of scope

- Multi-tenancy — RedyQuote is single-tenant for REDYREF; no `tenant_id` scaffolding.
- PDF or email quote delivery — "Mark as Sent" is a manual status button only.
- Granular role-based access control beyond the one approval gate — matches REDYREF's
  actual sales process, not a new permissions system.
- Historical data import — v1 launches with an empty catalog and no historical quotes;
  importing past data is a later, optional pass if REDYREF wants it to carry over.

## 5. Success Criteria

- A rep can build, save, and submit a quote; an admin can approve it; either can mark it
  Sent — matching the current workflow.
- An approval attempt by a non-admin is rejected by the database (RLS), not just hidden
  in the UI.
- A failed save never leaves a quote with missing or duplicated line items.
- Two simultaneous new quotes never receive the same quote number.
- Every quote status change has a corresponding audit row (who, when, from/to status).

## 6. Anti-Patterns

- **Don't enforce access control in the UI only.** Hiding the Approve button for
  non-admins is not access control — every non-flat rule (the approval gate) must be
  enforced by RLS and hold even against a bypassed or tampered client.
- **Don't delete-then-reinsert on multi-row saves.** Deleting all line items and
  re-inserting them is fragile — an insert failure after a successful delete silently
  loses data; saves must be atomic.
- **Don't compute identifiers client-side.** Counting existing rows client-side to
  generate quote numbers is a race condition waiting to happen; sequence generation
  belongs server-side.
- **Don't build a new permissions system.** The one rep/admin distinction is intentional
  and sufficient for REDYREF's actual sales process — adding broader RBAC is scope creep,
  not a fix.
- **Don't add multi-tenant scaffolding.** RedyQuote is single-tenant for REDYREF; no
  `tenant_id`, no plan for reselling — don't design for a hypothetical second client.
