"use client";

import { PageBody } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Route-scoped error boundary. Must be a client component — Next requires it.
//
// The message is deliberately not the raw error. Settings is Internal rather
// than Confidential (ARCHITECTURE.md §7), but the reason for hiding the string
// is the same as on the other three routes: a Postgres error here names
// `settings`, `settings_history`, and `is_admin()` — the exact shape of the
// admin-only write path (PRD-018B). `error.digest` is the server-side
// correlation id, which is what a support conversation actually needs.
//
// It covers the Defaults, Branding, and History tabs together, because they are
// one route with a client-side tab switch, not three segments. A failure in the
// history read (the narrowest of the three, `is_admin()`-gated since migration
// 0005) therefore takes the whole page — which is honest: a rep who cannot read
// history should see the tab refuse, not the page pretend.
export default function SettingsError({
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
          <h1 className="text-md font-semibold">
            Settings could not be loaded
          </h1>
          <p className="text-sm text-muted-foreground">
            Nothing was changed. Your estimating defaults are unaffected. Try
            again, and if it keeps happening give your admin the reference
            below.
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
