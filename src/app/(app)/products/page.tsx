import { PageBody, PageHeader } from "@/components/layout/page-header";
import { AdminOnly, ReadOnlyNotice } from "@/components/prototype/admin-only";
import { Button } from "@/components/ui/button";
import { PRODUCTS } from "@/lib/mock";

import { ProductTable } from "./_components/ProductTable";

// Product catalog (PRD-003). Reps read; admins own every write (PRD-019).

export default function ProductsPage() {
  return (
    <PageBody>
      <PageHeader
        title="Products"
        description="Fabricated products, their quantity-tier fab pricing, and the default component for each category."
        actions={
          <AdminOnly fallback={<ReadOnlyNotice what="The product catalog" />}>
            <Button>New product</Button>
          </AdminOnly>
        }
      />

      <ProductTable products={PRODUCTS} />
    </PageBody>
  );
}
