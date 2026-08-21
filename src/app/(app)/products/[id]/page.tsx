import { notFound } from "next/navigation";

import { PageBody, PageHeader } from "@/components/layout/page-header";
import { DeactivatedBadge } from "@/components/freshness-badge";
import { createClient } from "@/lib/supabase/server";
import { deriveFreshness } from "@/lib/freshness";

import { ProductEditor } from "../_components/ProductEditor";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    productRes,
    tiersRes,
    defaultsRes,
    categoriesRes,
    componentsRes,
    settingsRes,
  ] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase
      .from("fab_tiers")
      .select("*")
      .eq("product_id", id)
      .order("qty_tier"),
    supabase.from("product_defaults").select("*").eq("product_id", id),
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("components").select("*").order("name"),
    supabase
      .from("settings")
      .select("freshness_warning_months, freshness_requote_months")
      .single(),
  ]);

  if (productRes.error || !productRes.data) notFound();

  const productRaw = productRes.data;
  const tiersRaw = tiersRes.data ?? [];
  const defaults = defaultsRes.data ?? [];
  const categories = categoriesRes.data ?? [];
  const components = componentsRes.data ?? [];

  const warn = settingsRes.data?.freshness_warning_months ?? 3;
  const requote = settingsRes.data?.freshness_requote_months ?? 6;

  // Apply freshness calculation to each tier so the badge renders correctly
  const tiers = tiersRaw.map((tier) => ({
    ...tier,
    freshness: deriveFreshness(tier.quoted_date, warn, requote),
  }));

  return (
    <PageBody>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {productRaw.name}
            {!productRaw.active ? <DeactivatedBadge /> : null}
          </span>
        }
        description={productRaw.description ?? "No description."}
      />

      <ProductEditor
        product={productRaw}
        tiers={tiers}
        defaults={defaults}
        categories={categories}
        components={components}
      />
    </PageBody>
  );
}
