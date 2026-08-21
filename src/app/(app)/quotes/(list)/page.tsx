import Link from "next/link";

import { PageBody, PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KpiStat } from "@/components/ui/kpi-stat";
import { createClient } from "@/lib/supabase/server";
import { deriveFreshness } from "@/lib/freshness";

import { QuoteTable, type DbQuoteRow } from "../_components/QuoteTable";

// The "toolbar + KPI strip + table" pattern from DESIGN-SYSTEM.md §9.
//
// A Server Component: the read path.

export default async function QuotesPage() {
  const supabase = await createClient();

  const [quotesRes, componentsRes, settingsRes] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        `
        *,
        products ( name ),
        fab_tiers ( qty_tier ),
        owner:profiles!quotes_owner_id_fkey ( full_name )
      `,
      )
      .order("updated_at", { ascending: false }),
    supabase.from("components").select("id, active, quoted_date"),
    supabase
      .from("settings")
      .select(
        "margin_floor_percent, freshness_warning_months, freshness_requote_months",
      )
      .single(),
  ]);

  const rawQuotes = quotesRes.data ?? [];

  const quotes: DbQuoteRow[] = rawQuotes.map((q) => ({
    id: q.id,
    quote_number: q.quote_number,
    customer_name: q.customer_name,
    product_name: q.products?.name ?? "Unknown Product",
    qty_tier: q.fab_tiers?.qty_tier ?? 0,
    status: q.status,
    final_price_each: q.final_price_each,
    gp_percent: q.gp_percent,
    below_margin_floor: q.below_margin_floor,
    owner_name: q.owner?.full_name ?? "Unknown Owner",
    updated_at: q.updated_at,
  }));

  const components = componentsRes.data ?? [];
  const settings = settingsRes.data ?? { margin_floor_percent: 40 };
  const warn = settingsRes.data?.freshness_warning_months ?? 3;
  const requote = settingsRes.data?.freshness_requote_months ?? 6;

  const pendingApproval = quotes.filter(
    (q) => q.status === "pending_approval",
  ).length;
  const belowFloor = quotes.filter((q) => q.below_margin_floor).length;

  const staleComponents = components.filter((c) => {
    if (!c.active) return false;
    const freshness = deriveFreshness(c.quoted_date, warn, requote);
    return freshness !== "current";
  }).length;

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
          <KpiStat label="Total quotes" value={quotes.length} />
          <KpiStat
            label="Review"
            value={pendingApproval}
            tone={pendingApproval > 0 ? "warning" : "neutral"}
          />
          <KpiStat
            label={`Below ${settings.margin_floor_percent.toFixed(1)}% margin floor`}
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

      <QuoteTable quotes={quotes} />
    </PageBody>
  );
}
