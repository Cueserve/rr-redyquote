import { PageBody, PageHeader } from "@/components/layout/page-header";
import { QuoteBuilder } from "@/components/quote-builder/quote-builder";
import {
  CATEGORIES,
  COMPONENTS,
  CURRENT_USER,
  FAB_TIERS,
  PRODUCTS,
  PRODUCT_DEFAULTS,
  SETTINGS,
} from "@/lib/mock";

/**
 * A new quote has no number yet — PRD-011 allocates `Q-YYYY-NNNN` from a
 * Postgres sequence inside the save transaction, never client-side. So this
 * page shows no number at all rather than a placeholder one, which is the
 * design consequence of the requirement.
 */
export default function NewQuotePage() {
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
