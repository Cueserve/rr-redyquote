import { notFound } from "next/navigation";

import { PageBody, PageHeader } from "@/components/layout/page-header";
import { QuoteStatusBadge } from "@/components/quote-status-badge";
import { QuoteBuilder } from "@/components/quote-builder/quote-builder";
import {
  CATEGORIES,
  COMPONENTS,
  CURRENT_USER,
  FAB_TIERS,
  PRODUCTS,
  PRODUCT_DEFAULTS,
  SETTINGS,
  getQuote,
  getQuoteHistory,
  getQuoteLines,
} from "@/lib/mock";
import { formatDate } from "@/lib/utils";

// Server Component: the read path. When wiring lands these lookups become
// session-bound Supabase selects, so RLS decides what this page can see
// (ARCHITECTURE.md §1) — the component tree below does not change.

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = getQuote(id);
  if (!quote) notFound();

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
        lines={getQuoteLines(quote.id)}
        history={getQuoteHistory(quote.id)}
        products={PRODUCTS}
        fabTiers={FAB_TIERS}
        categories={CATEGORIES}
        components={COMPONENTS}
        productDefaults={PRODUCT_DEFAULTS}
        settings={SETTINGS}
        currentUserId={CURRENT_USER.id}
      />
    </PageBody>
  );
}
