import { PageBody, PageHeader } from "@/components/layout/page-header";
import { AdminOnly, ReadOnlyNotice } from "@/components/prototype/admin-only";
import { Button } from "@/components/ui/button";
import { CATEGORIES, COMPONENTS } from "@/lib/mock";

import { ComponentTable } from "./_components/ComponentTable";

// Component library (PRD-006). The route is `library/` and its action file is
// `library.ts` — deliberately not `components.ts`, which would read as a
// collision with `src/components/` (PROJECT-STRUCTURE.md §5).

export default function LibraryPage() {
  return (
    <PageBody>
      <PageHeader
        title="Component library"
        description="Reusable components by category, with a full price history behind every cost change."
        actions={
          <AdminOnly fallback={<ReadOnlyNotice what="The component library" />}>
            <Button>New component</Button>
          </AdminOnly>
        }
      />

      <ComponentTable components={COMPONENTS} categories={CATEGORIES} />
    </PageBody>
  );
}
