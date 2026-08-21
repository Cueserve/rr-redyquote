import Link from "next/link";

import { PageBody, PageHeader } from "@/components/layout/page-header";
import { AdminOnly, ReadOnlyNotice } from "@/components/prototype/admin-only";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { deriveFreshness, type Freshness } from "@/lib/freshness";

import { ProductTable, type ProductRow } from "../_components/ProductTable";

// Product catalog (PRD-003). Reps read; admins own every write (PRD-019).
//
// In the `(list)` group so the `loading.tsx` beside it covers /products only —
// see PROJECT-STRUCTURE.md §1, "List loading boundary rule".

export default async function ProductsPage() {
  const supabase = await createClient();

  const [productsRes, settingsRes] = await Promise.all([
    supabase.from("products").select("*, fab_tiers(quoted_date)"),
    supabase
      .from("settings")
      .select("freshness_warning_months, freshness_requote_months")
      .single(),
  ]);

  const rawProducts = productsRes.data ?? [];
  const warn = settingsRes.data?.freshness_warning_months ?? 3;
  const requote = settingsRes.data?.freshness_requote_months ?? 6;

  const products: ProductRow[] = rawProducts.map((p) => {
    const tiers = p.fab_tiers || [];
    const tier_count = tiers.length;
    let worst_tier_freshness: Freshness | "unquoted" = "unquoted";

    if (tier_count > 0) {
      // Find the oldest quoted_date among all tiers
      const oldestDate = tiers.map((t) => t.quoted_date).sort()[0];

      worst_tier_freshness = deriveFreshness(oldestDate, warn, requote);
    }

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      vendor: p.vendor,
      est_labor_hours: p.est_labor_hours,
      active: p.active,
      updated_at: p.updated_at,
      tier_count,
      worst_tier_freshness,
    };
  });

  return (
    <PageBody>
      <PageHeader
        title="Products"
        description="Fabricated products, their quantity-tier fab pricing, and the default component for each category."
        actions={
          <AdminOnly>
            <Button asChild>
              <Link href="/products/new">New product</Link>
            </Button>
          </AdminOnly>
        }
        notice={
          <AdminOnly fallback={<ReadOnlyNotice what="The product catalog" />}>
            {null}
          </AdminOnly>
        }
      />

      <ProductTable products={products} />
    </PageBody>
  );
}
