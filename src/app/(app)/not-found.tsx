import Link from "next/link";

import { PageBody } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * The not-found boundary for every authenticated route — what `notFound()` in
 * `products/[id]`, `library/[id]`, and `quotes/[id]` renders.
 *
 * KNOWN GAP, measured rather than assumed: `/quotes/<bad-id>` renders this page
 * but returns HTTP **200**, while `/products/<bad-id>` and `/library/<bad-id>`
 * correctly return 404. The cause is `quotes/loading.tsx`. It creates a Suspense
 * boundary over the whole `quotes/` subtree, so the response streams and its
 * status is committed before `notFound()` runs. Verified by removing that one
 * file: the same URL then returned 404, and 200 again once it was restored.
 * (An `error.tsx` at the segment was the first suspect and is not the cause —
 * `products/` has no error boundary and behaves the same way once a loading
 * boundary is added.)
 *
 * Not fixed here because the fix is structural: the list's loading UI and the
 * detail routes have to stop sharing a segment, which is a change to the layout
 * PROJECT-STRUCTURE.md §1 prescribes by name. Consequence is cosmetic for users
 * — the page renders correctly either way — but it does mislead crawlers and
 * uptime monitoring.
 *
 * The copy stays vague on purpose. Any signed-in REDYREF user may read any quote
 * (ARCHITECTURE.md §7, flat reads), so "no such quote" is accurate today — but
 * if reads ever narrow, a 404 that distinguishes "does not exist" from "not
 * yours" would leak the difference.
 */
export default function AppNotFound() {
  return (
    <PageBody>
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-md font-semibold">Not Found.</h1>
          <p className="text-sm text-muted-foreground">
            That record does not exist, or the link is out of date.
          </p>
        </div>
        <div>
          <Button asChild variant="outline">
            <Link href="/quotes">Back to quotes</Link>
          </Button>
        </div>
      </Card>
    </PageBody>
  );
}
