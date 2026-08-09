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
          <AdminOnly>
            <Button asChild>
              <Link href="/products/new">New product</Link>
            </Button>
          </AdminOnly>
        }
        // Split from `actions` on purpose: the action slot is shrink-0 and
        // cannot carry a sentence (see page-header.tsx). Admins get the button
        // and no notice; reps get the notice and no button.
        notice={
          <AdminOnly fallback={<ReadOnlyNotice what="The product catalog" />}>
            {null}
          </AdminOnly>
        }
      />

      <ProductTable products={PRODUCTS} />
    </PageBody>
  );
}
