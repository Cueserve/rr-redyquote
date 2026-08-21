"use client";

import { Lock } from "lucide-react";
import { useIsAdmin } from "./role-context";

/**
 * Lets a Server Component page hand a subtree to the client-side role switch
 * without becoming a client component itself. It answers "should this be
 * offered?" and never "is this allowed?" — the second question is answered by
 * Postgres RLS.
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
 * The standard read-only notice for a rep looking at admin-owned data.
 */
export function ReadOnlyNotice({ what }: { what: string }) {
  return (
    <p className="flex max-w-[57ch] items-center gap-2 text-xs text-muted-foreground">
      <Lock aria-hidden="true" className="size-3.5" />
      {what} is maintained by an admin. You can read it here; edits are
      admin-only and enforced by the database.
    </p>
  );
}
