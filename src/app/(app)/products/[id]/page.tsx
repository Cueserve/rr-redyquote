import { notFound } from "next/navigation";

import { PageBody, PageHeader } from "@/components/layout/page-header";
import { DeactivatedBadge } from "@/components/freshness-badge";
import {
  CATEGORIES,
  COMPONENTS,
  getFabTiers,
  getProduct,
  getProductDefaults,
} from "@/lib/mock";

import { ProductEditor } from "../_components/ProductEditor";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) notFound();

  return (
    <PageBody>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {product.name}
            {!product.active ? <DeactivatedBadge /> : null}
          </span>
        }
        description={product.description ?? "No description."}
      />

      <ProductEditor
        product={product}
        tiers={getFabTiers(product.id)}
        defaults={getProductDefaults(product.id)}
        categories={CATEGORIES}
        components={COMPONENTS}
      />
    </PageBody>
  );
}
