import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/update-session";

/**
 * Next 16 middleware entry (renamed from `middleware.ts`). The framework calls
 * the export named `proxy`, falling back to a default export.
 *
 * Scope is deliberately narrow: refresh the Supabase session and hand back the
 * response carrying rotated cookies. It does NOT gate routes — authorization is
 * enforced by Postgres RLS (docs/ARCHITECTURE.md §1, NFR-002), with the
 * authenticated shell at src/app/(app)/layout.tsx doing the server-side session
 * check and redirect. A middleware redirect is a UX convenience, never the
 * security boundary, and duplicating the check here would invite treating it as
 * one.
 */
export async function proxy(request: NextRequest) {
  const { response } = await updateSession(request);

  return response;
}

export const config = {
  matcher: [
    /*
     * Every path except static assets and image files. Auth cookies must be
     * refreshed on real navigations, not on asset fetches.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
