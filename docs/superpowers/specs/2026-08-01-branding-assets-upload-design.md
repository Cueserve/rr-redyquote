# Branding Assets Upload — Design Spec

**Owner:** Viral Parikh
**Date:** 2026-08-01
**Status:** Draft (design only; no implementation in this change)
**Scope:** Settings > Branding upload flow for logo and favicon

---

## 1. Purpose

Define a future implementation for uploading two organization-wide branding assets:

- Logo (previewed from `/public/redyref-logo.png`)
- Favicon (previewed from `/src/app/favicon.ico` at runtime as `/favicon.ico`)

This spec intentionally avoids implementation code and avoids schema changes in `settings` for now.

## 2. Current UI Baseline

The Branding tab now shows two cards side by side:

- `Logo` card first
- `Favicon` card second

Each card is preview-only and renders the currently committed files. No upload controls are shown in this phase.

## 3. Design Goals

1. Keep branding as global, org-wide assets.
2. Preserve admin-only write behavior for branding changes.
3. Avoid storing binary files in Postgres tables.
4. Keep asset replacement atomic from the user perspective.
5. Maintain an audit trail for who changed branding and when.

## 4. Candidate Storage Strategies

### Option A — Overwrite repo/static files at runtime

- Replace `/public/redyref-logo.png` and `/src/app/favicon.ico` directly.

Pros:

- Simple mental model.
- Matches current file locations.

Cons:

- Not portable to typical production runtimes (read-only build artifacts).
- Multi-instance consistency is unreliable.
- Coupled to deployment internals.

Assessment: suitable only for local/dev tooling, not production architecture.

### Option B — Supabase Storage with fixed object keys (recommended)

- Keep fixed object paths, e.g.:
  - `branding/logo.png`
  - `branding/favicon.ico`
- Upload overwrites existing object at same key.
- UI previews resolve to storage-backed URLs.

Pros:

- Runtime-safe for cloud deployments.
- Consistent across instances.
- No schema change required for initial rollout if keys are fixed.

Cons:

- Requires storage bucket and RLS policy setup.
- Cache invalidation strategy required.

Assessment: best fit for RedyQuote architecture with minimal schema impact.

## 5. Recommended Future Flow (No settings schema change)

1. Admin opens Settings > Branding.
2. Admin selects file for Logo or Favicon.
3. Server Action validates type and size.
4. Server Action writes to fixed storage key (`branding/logo.png` or `branding/favicon.ico`) with overwrite.
5. Server Action records audit event in existing audit mechanism (or a dedicated branding audit table if needed later).
6. UI revalidates and refreshes previews.

Note: if stronger cache busting is required later, a version token can be introduced in a future migration, but that is explicitly out of this phase.

## 6. Validation Rules (proposed)

### Logo

- Allowed types: `image/png`, `image/svg+xml`
- Max size: configurable; initial cap 2 MB
- SVG sanitization: required before acceptance if SVG support remains enabled

### Favicon

- Allowed types: `image/x-icon`, `image/vnd.microsoft.icon`, `image/png`
- If PNG is accepted, conversion to ICO is performed server-side before overwrite
- Target visual: square icon preserving brand legibility at 16px/32px

## 7. Authorization and Security

- Upload/replace actions are admin-only.
- Enforcement is database/storage policy first, not UI only.
- Server Action performs MIME and file signature checks.
- Reject files with mismatched content-type vs actual bytes.

## 8. Non-Goals

- No implementation code in this spec.
- No `settings` table schema changes in this phase.
- No in-app role management changes.

## 9. Rollout Plan (future)

1. Add storage bucket + policies.
2. Implement branding upload Server Actions.
3. Add upload controls back into Branding tab.
4. Add preview URL resolver and revalidation.
5. Add/confirm audit logging.
6. End-to-end validation with admin and rep roles.

## 10. Open Questions

1. Should SVG for logo be allowed initially or deferred to PNG-only for security simplicity?
2. Do we require automatic ICO generation for favicon uploads from PNG?
3. Is existing `settings_history` sufficient for branding audit, or should branding get a dedicated history table/event model?
4. Which cache policy should be canonical for branding assets (URL versioning vs response headers)?
