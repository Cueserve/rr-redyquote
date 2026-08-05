import { PageBody, PageHeader } from "@/components/layout/page-header";
import { AdminOnly, ReadOnlyNotice } from "@/components/prototype/admin-only";
import { CATEGORIES } from "@/lib/mock";

import { ComponentEditor } from "../_components/ComponentEditor";

/**
 * There is no price-history panel here, unlike `library/[id]`. A component's
 * first cost is written as the first `price_history` row in the same transaction
 * that creates it (NFR-005) — so the history exists only after the save, and
 * rendering an empty "Price history" card would imply the append is optional.
 *
 * Creating a component is admin-only (PRD-019), so the form is gated rather than
 * merely disabled: a create form every field of which rejects input is worse
 * than no form. `AdminOnly` answers "should this be offered?" — the real guard
 * is the Server Action and RLS (NFR-002).
 */
export default function NewComponentPage() {
  return (
    <PageBody>
      <PageHeader
        title="New Component"
        description="The first cost recorded here becomes the first row of this component's price history."
      />

      <AdminOnly fallback={<ReadOnlyNotice what="The component library" />}>
        <ComponentEditor component={null} categories={CATEGORIES} />
      </AdminOnly>
    </PageBody>
  );
}
