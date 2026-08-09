"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A spinner that appears while the `<Link>` it sits inside is navigating.
 *
 * MUST be rendered as a descendant of a `next/link` `<Link>` — `useLinkStatus`
 * reads the nearest one through context and reports `pending: false` everywhere
 * else, so a misplaced instance is silently inert rather than an error.
 *
 * WHY THIS AND NOT A `loading.tsx`: the detail routes (`quotes/[id]`,
 * `products/[id]`, `library/[id]`) call `notFound()`, and a loading boundary at
 * those segments commits an HTTP 200 before it runs — measured, see
 * `(app)/not-found.tsx`. This gives the same "your click landed" feedback with
 * no Suspense boundary, so the 404s stay 404s.
 *
 * The spinner is the one in `Button`'s loading state (`Loader2 animate-spin`),
 * deliberately: a second spin idiom in the same app is noise. It is the standing
 * exception to DESIGN-SYSTEM.md §9's opacity-only motion rule, which that state
 * already established.
 *
 * It reserves its own width whether pending or not — the row must not reflow on
 * click, which is the layout shift the feedback exists to reassure past.
 */
function LinkPending({
  className,
  label = "Loading",
}: {
  className?: string;
  /** What a screen reader announces while the navigation is in flight. */
  label?: string;
}) {
  const { pending } = useLinkStatus();

  return (
    <span
      // `role="status"` on a permanently-mounted, initially-empty element:
      // live regions only announce content that arrives *after* the region is
      // in the DOM, so mounting the wrapper up front is what makes the label
      // audible when it appears (WCAG 2.2 4.1.3).
      role="status"
      aria-live="polite"
      className={cn("inline-flex size-3.5 shrink-0 items-center", className)}
    >
      {pending ? (
        <>
          <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
          <span className="sr-only">{label}</span>
        </>
      ) : null}
    </span>
  );
}

export { LinkPending };
