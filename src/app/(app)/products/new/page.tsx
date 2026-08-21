import { PageBody, PageHeader } from "@/components/layout/page-header";
import { AdminOnly, ReadOnlyNotice } from "@/components/layout/admin-only";
import { createClient } from "@/lib/supabase/server";

import { ProductEditor } from "../_components/ProductEditor";

/**
 * A new product has no id yet — it is allocated by Postgres inside the save
 * transaction (PRD-015), so this page shows no SKU placeholder and no tiers.
 * Tiers and category defaults are created alongside the product row in that one
 * write, which is why they start empty here rather than pre-seeded.
 *
 * Unlike `/quotes/new`, creating a product is admin-only (PRD-019), so the form
 * is gated rather than merely disabled: a create form every field of which
 * rejects input is worse than no form. `AdminOnly` answers "should this be
 * offered?" — the real guard is the Server Action and RLS (NFR-002).
 */
export default async function NewProductPage() {
  const supabase = await createClient();

  const [categoriesRes, componentsRes] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("components").select("*").order("name"),
  ]);

  const categories = categoriesRes.data ?? [];
  const components = componentsRes.data ?? [];

  return (
    <PageBody>
      <PageHeader
        title="New Product"
        description="Fab pricing tiers and category defaults are saved together with the product in one transaction."
      />

      <AdminOnly fallback={<ReadOnlyNotice what="The product catalog" />}>
        <ProductEditor
          product={null}
          tiers={[]}
          defaults={[]}
          categories={categories}
          components={components}
        />
      </AdminOnly>
    </PageBody>
  );
}
