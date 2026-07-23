# Authorization Matrix — Design Spec

**Owner:** Viral Parikh
**Date:** 2026-07-23
**Status:** Approved (design); source-of-truth doc edits pending (see §7)
**Resolves:** PRD §2A "Real Authorization Model", PRD-012, PRD-013
**Amends:** PRD-010 (Mark Sent), ARCHITECTURE §7 security posture, ARCHITECTURE §2 data design

---

## 1. Purpose

RedyQuote v1 had exactly one confirmed non-flat authorization rule — the admin-only
approval gate (PRD-010) — with every other write left as an unresolved "flat model" (PRD
§2A, PRD-012, PRD-013). This spec finalizes the complete authorization model so the RLS
policies, Server Action guards, and quote-builder UI can be implemented without further
product decisions.

**Chosen philosophy: _admin owns master data._** Reps do quoting; admins own the catalog,
component library, global settings, branding, and the approval gate. The system has exactly
two roles — `rep` (default, PRD-002) and `admin`.

## 2. Roles

| Role | Assigned | Scope |
| --- | --- | --- |
| `rep` | Default on first sign-in (PRD-002) | Create and manage **their own** quotes; submit for approval; mark **their own** approved quotes Sent; read all master data. |
| `admin` | Set out-of-band (Supabase dashboard/DB) | Everything a rep can do on **any** quote, plus the approval gate and **all** master-data / global-config writes. |

"Owner" throughout means the `owner` column on a quote equals the requesting user's
`auth.uid()`.

## 3. Authorization Matrix

### 3.1 Quotes

| Action | rep | admin | Enforcement |
| --- | --- | --- | --- |
| View any quote / dashboard | ✅ | ✅ | RLS: any authenticated (flat read) |
| Create quote | ✅ | ✅ | RLS insert; `owner` set to `auth.uid()` |
| Edit/delete **own** Draft/Pending quote | ✅ (own) | ✅ (any) | RLS: `owner = auth.uid() OR role = 'admin'` |
| Edit/delete **another user's** quote | ❌ | ✅ | RLS |
| Submit `Draft → Pending Approval` | ✅ (own) | ✅ | Transition validation + RLS |
| **Approve** `Pending Approval → Approved` | ❌ | ✅ | **RLS (structural invariant, PRD-010, NFR-002)** |
| Mark `Approved → Sent` | ✅ (own) | ✅ | RLS: `owner = auth.uid() OR role = 'admin'` — **amends PRD-010** |

### 3.2 Master data — admin owns

| Action | rep | admin | Enforcement |
| --- | --- | --- | --- |
| View products / components | ✅ | ✅ | RLS: any authenticated (flat read) |
| Product create / edit / deactivate | ❌ | ✅ | RLS: `role = 'admin'` |
| Fab-tier create / edit | ❌ | ✅ | RLS: `role = 'admin'` |
| Product default component set | ❌ | ✅ | RLS: `role = 'admin'` |
| Component create / edit / deactivate | ❌ | ✅ | RLS: `role = 'admin'` |

### 3.3 Global config — admin only

| Action | rep | admin | Enforcement |
| --- | --- | --- | --- |
| Edit settings (labor rate, markups, cushion %, commission %, margin floor %, freshness thresholds) | ❌ | ✅ | RLS: `role = 'admin'` (resolves PRD-012) |
| Upload / apply branding favicon | ❌ | ✅ | RLS: `role = 'admin'` (resolves PRD-013) |

### 3.4 Out-of-band (explicitly NOT in-app for v1)

- **Account provisioning** (PRD-001) and **role assignment** (`rep ↔ admin`) are done via
  the Supabase dashboard / direct DB access. No in-app user-management screen is in v1
  scope — do not build one.

## 4. Enforcement model

**All writes are RLS-enforced at the database, not just guarded in Server Actions**
(confirmed decision, extends NFR-002 beyond the approval gate). App-layer checks in Server
Actions are for UX (early rejection, clear errors) only; the database is the trust boundary.
A bypassed or scripted client hitting Postgres directly under a rep session is denied every
admin-only write by policy.

This makes the authorization model a **structural guarantee**, consistent with
ARCHITECTURE's existing invariants, rather than a UI convention.

**RLS policy surface (new/changed):**

- `quotes` — insert (any auth); select (any auth); update/delete (`owner = auth.uid() OR
  admin`); the `Pending Approval → Approved` update additionally gated to `admin` (existing
  invariant).
- `quote_lines` — writes allowed only when the parent quote is writable by the caller
  (owner or admin).
- `products`, `fab_tiers`, `product_defaults`, `components` — select (any auth);
  insert/update/delete (`admin`).
- `settings` — select (any auth); update (`admin`).
- Branding storage object write — `admin` only.
- `price_history`, `quote_status_history`, `settings_history` — insert only, via the RPC
  transactions that write them (append-only; no direct client writes, no updates/deletes).

## 5. Deactivation behavior (PRD §2A open item)

Deactivating a product or component is a soft state, not a delete:

- **Existing quotes** that already reference the item **keep it, priced as-is, rendered with
  a visible "Deactivated" badge** so the user knows the line references retired master data.
- The item is **not selectable in the quote builder for new lines** on any quote (existing
  or new).
- Deactivated items remain **viewable** everywhere and **editable only by admins** (per
  §3.2) — e.g. an admin can reactivate.

This preserves historical quote pricing integrity while stopping stale items from spreading
onto new work.

## 6. Audit expansion (PRD §2A open item — confirmed yes)

Beyond the existing `price_history` (cost changes) and `quote_status_history` (status
changes), **settings and branding changes are now audited.**

- New append-only table **`settings_history`**: `id`, `changed_field`, `old_value`,
  `new_value`, `actor` (`auth.uid()`), `changed_at`. One row per changed field.
- Written in the **same transaction** as the settings/branding update (consistent with
  NFR-005 and the "audit rows written in the same transaction" invariant).
- Append-only: insert-only RLS, no updates or deletes, mirroring the other history tables.

This satisfies the "append, never overwrite" invariant for global config the same way
`price_history` does for costs.

## 7. Required source-of-truth doc edits (pending separate approval)

Per project rules, `docs/` edits are deliberate decisions and are called out here rather
than folded into feature work. This spec drives the following edits, to be made and approved
separately:

1. **PRD-010** — change "Any signed-in user can mark an Approved quote Sent (flat model)"
   to "The quote's owner or an admin can mark an Approved quote Sent."
2. **PRD-012 / PRD-013** — replace "pending product decision" with: settings and branding
   edits are **admin-only**.
3. **PRD §2A "Real Authorization Model"** — mark resolved; reference this spec.
4. **PRD §2A audit bullet** — settings/branding changes audited via `settings_history`.
5. **PRD §3 / PRODUCT §4** — note the deactivation-behavior rule (§5 above).
6. **ARCHITECTURE §2** — add the `settings_history` table to the data-design table.
7. **ARCHITECTURE §4 / §5 / §7** — update the "flat model" language and the approval-gate
   Key Design Decision to reflect the full admin-owns-master-data model; note all writes are
   RLS-enforced, not just the approval gate.
8. **ARCHITECTURE §7 security posture** — the "Settings … Any signed-in user may edit"
   row becomes admin-only.

## 8. Out of scope

- In-app user management / role assignment UI (v1: out-of-band).
- Per-field settings permissions (settings is all-or-nothing admin).
- Any third+ role beyond `rep` / `admin` (PRD §3: RBAC beyond the approval gate is a
  non-requirement — this spec stays within a two-role model).
