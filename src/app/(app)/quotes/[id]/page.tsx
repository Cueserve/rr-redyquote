import { notFound } from "next/navigation";

import { PageBody, PageHeader } from "@/components/layout/page-header";
import { QuoteStatusBadge } from "@/components/quote-status-badge";
import { QuoteBuilder } from "@/components/quote-builder/quote-builder";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { deriveFreshness } from "@/lib/freshness";
import type {
  DbQuote,
  DbQuoteLine,
  DbQuoteHistory,
  DbProduct,
  DbFabTier,
  DbCategory,
  DbComponent,
  DbProductDefault,
} from "@/components/quote-builder/quote-builder";

// Server Component: the read path. When wiring lands these lookups become
// session-bound Supabase selects, so RLS decides what this page can see
// (ARCHITECTURE.md §1) — the component tree below does not change.

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    quoteRes,
    linesRes,
    historyRes,
    productsRes,
    fabTiersRes,
    categoriesRes,
    componentsRes,
    productDefaultsRes,
    settingsRes,
    userRes,
  ] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        `
        *,
        products ( name ),
        fab_tiers ( qty_tier ),
        owner:profiles!quotes_owner_id_fkey ( full_name ),
        approver:profiles!quotes_approved_by_fkey ( full_name )
      `,
      )
      .eq("id", id)
      .single(),
    supabase.from("quote_lines").select("*").eq("quote_id", id),
    supabase
      .from("quote_status_history")
      .select(`*, actor:profiles!quote_status_history_actor_fkey(full_name)`)
      .eq("quote_id", id),
    supabase.from("products").select("*"),
    supabase.from("fab_tiers").select("*"),
    supabase.from("categories").select("*"),
    supabase.from("components").select("*"),
    supabase.from("product_defaults").select("*"),
    supabase.from("settings").select("*").single(),
    supabase.auth.getUser(),
  ]);

  if (!quoteRes.data) notFound();

  const q = quoteRes.data;
  const quote: DbQuote = {
    ...q,
    product_name: q.products?.name ?? "Unknown Product",
    qty_tier: q.fab_tiers?.qty_tier ?? 0,
    owner_name: q.owner?.full_name ?? "Unknown Owner",
    approved_by_name: q.approver?.full_name ?? null,
    stale_line_count: 0, // This could be calculated below if we wanted, but not strictly needed for this page
  };

  const rawSettings = settingsRes.data;
  if (!rawSettings) throw new Error("Settings not found");
  const warn = rawSettings.freshness_warning_months;
  const requote = rawSettings.freshness_requote_months;

  const rawComponents = componentsRes.data ?? [];
  const components: DbComponent[] = rawComponents.map((c) => ({
    ...c,
    freshness: deriveFreshness(c.quoted_date, warn, requote),
  }));

  const lines: DbQuoteLine[] = (linesRes.data ?? []).map((line) => {
    const comp = components.find((c) => c.id === line.component_id);
    return {
      ...line,
      freshness: comp?.freshness ?? "current",
      component_deactivated: comp ? !comp.active : false,
    };
  });

  const history: DbQuoteHistory[] = (historyRes.data ?? []).map((h) => ({
    ...h,
    actor_name: h.actor?.full_name ?? "Unknown",
  }));

  const fabTiers: DbFabTier[] = (fabTiersRes.data ?? []).map((tier) => ({
    ...tier,
    freshness: deriveFreshness(tier.quoted_date, warn, requote),
  }));

  const products: DbProduct[] = productsRes.data ?? [];
  const categories: DbCategory[] = categoriesRes.data ?? [];

  const productDefaultsDict: Record<string, DbProductDefault[]> = {};
  for (const def of productDefaultsRes.data ?? []) {
    if (!productDefaultsDict[def.product_id]) {
      productDefaultsDict[def.product_id] = [];
    }
    productDefaultsDict[def.product_id].push(def);
  }

  const currentUser = userRes.data.user;
  if (!currentUser) throw new Error("Not logged in");

  return (
    <PageBody>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="font-mono tabular-nums">{quote.quote_number}</span>
            <QuoteStatusBadge status={quote.status} />
          </span>
        }
        description={`${quote.customer_name} · ${quote.product_name} · ${quote.qty_tier}+ units · owned by ${quote.owner_name} · updated ${formatDate(quote.updated_at)}`}
      />

      <QuoteBuilder
        quote={quote}
        lines={lines}
        history={history}
        products={products}
        fabTiers={fabTiers}
        categories={categories}
        components={components}
        productDefaults={productDefaultsDict}
        settings={rawSettings}
        currentUserId={currentUser.id}
      />
    </PageBody>
  );
}
