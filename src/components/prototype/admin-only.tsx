"use client";

import { Lock } from "lucide-react";

import { useIsAdmin } from "./role-context";

/**
 * PROTOTYPE ONLY — delete with the rest of `src/components/prototype/`.
 *
 * Lets a Server Component page hand a subtree to the client-side role switch
 * without becoming a client component itself. It answers "should this be
 * offered?" and never "is this allowed?" — the second question is answered by
 * Postgres RLS (PRD-019, NFR-002).
 *
 * When real auth lands, the role comes from a server-side `profiles` read and
 * this collapses into a plain `{isAdmin && ...}` in the page.
 */
export function AdminOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return useIsAdmin() ? <>{children}</> : <>{fallback}</>;
}

/**
 * The standard read-only notice for a rep looking at admin-owned data. Reps may
 * read master data and settings; only admins may write them (PRD-019,
 * ARCHITECTURE.md §7).
 */
export function ReadOnlyNotice({ what }: { what: string }) {
  return (
    // The measure cap lives here, not only in PageHeader's `notice` slot. That
    // slot caps it to 65ch, but an editor that renders this directly (see
    // ComponentEditor / ProductEditor) got no cap at all and ran 756px wide --
    // 99 characters per line, measured. `ch` resolves against this element's
    // own font-size, so declaring text-xs here is what makes 65ch mean 65ch;
    // same reasoning as page-header.tsx's notice row.
    <p className="flex max-w-[65ch] items-center gap-2 text-xs text-muted-foreground">
      <Lock aria-hidden="true" className="size-3.5" />
      {what} is maintained by an admin. You can read it here; edits are
      admin-only and enforced by the database.
    </p>
  );
}
