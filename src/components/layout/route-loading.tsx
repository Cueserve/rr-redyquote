import { PageBody } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * The body of every `loading.tsx` in the app. Shared rather than copied because
 * seven identical files drift, and a route whose loading state looks different
 * from its neighbour's reads as a bug rather than as a style.
 *
 * DESIGN-SYSTEM.md §11: "Empty and loading states are plain. 'Loading…' — no
 * illustration, no cute copy." No skeleton shimmer either — motion is limited
 * to 120–160ms opacity fades on toasts, tooltips and dialogs (§9).
 *
 * WHERE IT MAY NOT BE USED: any segment whose page calls `notFound()` — which
 * means any `<route>/[id]`. A
 * `loading.tsx` there wraps the page in a Suspense boundary, the response
 * starts streaming, the status is committed, and `notFound()` then renders the
 * 404 UI with **HTTP 200**. Measured 2026-08-09: adding
 * a `[id]/loading.tsx` turned `/<route>/bad-id` from 404 into 200 while
 * a sibling route stayed 404 as the control. That is the same trap
 * PROJECT-STRUCTURE.md §4's "list loading boundary rule" describes, and the
 * `(list)` route groups exist to dodge; it applies to detail segments too.
 *
 * Navigation feedback for those routes comes from `LinkPending` instead, which
 * needs no boundary.
 */
export function RouteLoading() {
  return (
    <PageBody>
      <EmptyState>
        <p>Loading…</p>
      </EmptyState>
    </PageBody>
  );
}
