import Link from "next/link";

import { PageBody, PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KpiStat } from "@/components/ui/kpi-stat";
import { COMPONENTS, QUOTES, SETTINGS } from "@/lib/mock";

import { QuoteTable } from "../_components/QuoteTable";

// The "toolbar + KPI strip + table" pattern from DESIGN-SYSTEM.md §9.
//
// A Server Component: the read path. Once wiring lands, the three constants
// below become session-bound Supabase selects so RLS applies to every read
// (ARCHITECTURE.md §1); nothing else on this page changes.

export default function QuotesPage() {
  const pendingApproval = QUOTES.filter(
    (q) => q.status === "pending_approval",
  ).length;
  const belowFloor = QUOTES.filter((q) => q.below_margin_floor).length;

  // PRD-009's stale-priced component count. Reading a literal `freshness` field
  // off each fixture row rather than deriving it: the requirement is that the
  // badge and this count come from the same configured thresholds, which means
  // one shared module owns the derivation — and that module isn't written yet.
  const staleComponents = COMPONENTS.filter(
    (c) => c.active && c.freshness !== "current",
  ).length;

  return (
    <PageBody>
      <PageHeader
        title="Quotes"
        description="Every quote in the system. Reps see their own work and everyone else's; approval is the only gated step."
        actions={
          <Button asChild>
            <Link href="/quotes/new">New quote</Link>
          </Button>
        }
      />

      <Card padding="compact">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiStat label="Total quotes" value={QUOTES.length} />
          <KpiStat
            label="Review"
            value={pendingApproval}
            tone={pendingApproval > 0 ? "warning" : "neutral"}
          />
          <KpiStat
            label={`Below ${SETTINGS.margin_floor_percent.toFixed(1)}% margin floor`}
            value={belowFloor}
            tone={belowFloor > 0 ? "destructive" : "neutral"}
          />
          <KpiStat
            label="Stale-priced components"
            value={staleComponents}
            tone={staleComponents > 0 ? "warning" : "neutral"}
          />
        </div>
      </Card>

      <QuoteTable quotes={QUOTES} />
    </PageBody>
  );
}
