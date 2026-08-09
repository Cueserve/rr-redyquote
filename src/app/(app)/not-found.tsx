import Link from "next/link";

import { PageBody } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * The not-found boundary for every authenticated route — what `notFound()` in
 * `products/[id]`, `library/[id]`, and `quotes/[id]` renders.
 *
 * FIXED, and load-bearing: all three of `/quotes/<bad-id>`, `/products/<bad-id>`
 * and `/library/<bad-id>` return HTTP **404**. Re-measured 2026-08-09.
 *
 * They used to return 200, because a `loading.tsx` sitting at the bare route
 * segment wrapped the whole subtree including `[id]`: the response streams, the
 * status is committed, and `notFound()` then renders this page under a 200. The
 * fix was the `(list)` route group, which keeps the list's loading UI off the
 * detail routes — PROJECT-STRUCTURE.md §4, "List loading boundary rule".
 *
 * It stays fixed only as long as no `loading.tsx` appears at `<route>/` or at
 * `<route>/[id]/`. Both reintroduce it; the `[id]` form was re-measured the same
 * day and flipped `/quotes/bad-id` straight back to 200 with `/products/bad-id`
 * unchanged as the control. That is why the detail routes have no loading UI and
 * use `LinkPending` for navigation feedback instead.
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
