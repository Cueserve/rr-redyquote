import Link from "next/link";

import { PageBody, PageHeader } from "@/components/layout/page-header";
import { AdminOnly, ReadOnlyNotice } from "@/components/prototype/admin-only";
import { Button } from "@/components/ui/button";
import { PRODUCTS } from "@/lib/mock";

import { ProductTable } from "../_components/ProductTable";

// Product catalog (PRD-003). Reps read; admins own every write (PRD-019).
//
// In the `(list)` group so the `loading.tsx` beside it covers /products only —
// see PROJECT-STRUCTURE.md §1, "List loading boundary rule".

export default function ProductsPage() {
  return (
    <PageBody>
      <PageHeader
        title="Products"
        description="Fabricated products, their quantity-tier fab pricing, and the default component for each category."
        actions={
          <AdminOnly fallback={<ReadOnlyNotice what="The product catalog" />}>
            <Button asChild>
              <Link href="/products/new">New product</Link>
            </Button>
          </AdminOnly>
        }
      />

      <ProductTable products={PRODUCTS} />
    </PageBody>
  );
}
