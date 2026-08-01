"use client";

import { PageBody } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Route-scoped error boundary. Must be a client component — Next requires it.
//
// The message is deliberately not the raw error: quote data is Confidential
// (ARCHITECTURE.md §7) and a Postgres error string can name tables, columns,
// and RLS policies. `error.digest` is the server-side correlation id, which is
// what a support conversation actually needs.
export default function QuotesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageBody>
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-md font-semibold">Quotes could not be loaded.</h1>
          <p className="text-sm text-muted-foreground">
            Nothing was changed. Try again, and if it keeps happening give your
            admin the reference below.
          </p>
        </div>
        {error.digest ? (
          <p className="font-mono text-xs text-muted-foreground">
            Reference {error.digest}
          </p>
        ) : null}
        <div>
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
        </div>
      </Card>
    </PageBody>
  );
}
