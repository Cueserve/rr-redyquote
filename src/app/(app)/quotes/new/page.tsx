import { PageBody, PageHeader } from "@/components/layout/page-header";
import { QuoteBuilder } from "@/components/quote-builder/quote-builder";
import { createClient } from "@/lib/supabase/server";
import { deriveFreshness } from "@/lib/freshness";
import type {
  DbProduct,
  DbFabTier,
  DbCategory,
  DbComponent,
  DbProductDefault,
} from "@/components/quote-builder/quote-builder";

/**
 * A new quote has no number yet — PRD-011 allocates `Q-YYYY-NNNN` from a
 * Postgres sequence inside the save transaction, never client-side. So this
 * page shows no number at all rather than a placeholder one, which is the
 * design consequence of the requirement.
 */
export default async function NewQuotePage() {
  const supabase = await createClient();

  const [
    productsRes,
    fabTiersRes,
    categoriesRes,
    componentsRes,
    productDefaultsRes,
    settingsRes,
    userRes,
  ] = await Promise.all([
    supabase.from("products").select("*"),
    supabase.from("fab_tiers").select("*"),
    supabase.from("categories").select("*"),
    supabase.from("components").select("*"),
    supabase.from("product_defaults").select("*"),
    supabase.from("settings").select("*").single(),
    supabase.auth.getUser(),
  ]);

  const rawSettings = settingsRes.data;
  if (!rawSettings) throw new Error("Settings not found");
  const warn = rawSettings.freshness_warning_months;
  const requote = rawSettings.freshness_requote_months;

  const rawComponents = componentsRes.data ?? [];
  const components: DbComponent[] = rawComponents.map((c) => ({
    ...c,
    freshness: deriveFreshness(c.quoted_date, warn, requote),
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
        title="New Quote"
        description="The quote number is assigned by the database when this is first saved."
      />

      <QuoteBuilder
        quote={null}
        lines={[]}
        history={[]}
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
