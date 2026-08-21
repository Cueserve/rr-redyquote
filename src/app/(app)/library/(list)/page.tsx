import Link from "next/link";

import { PageBody, PageHeader } from "@/components/layout/page-header";
import { AdminOnly, ReadOnlyNotice } from "@/components/prototype/admin-only";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { deriveFreshness } from "@/lib/freshness";

import { ComponentTable } from "../_components/ComponentTable";

// Component library (PRD-006). The route is `library/` and its action file is
// `library.ts` — deliberately not `components.ts`, which would read as a
// collision with `src/components/` (PROJECT-STRUCTURE.md §5).
//
// In the `(list)` group so the `loading.tsx` beside it covers /library only —
// see PROJECT-STRUCTURE.md §1, "List loading boundary rule".

export default async function LibraryPage() {
  const supabase = await createClient();

  const [categoriesRes, componentsRes, settingsRes] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("components").select("*").order("name"),
    supabase
      .from("settings")
      .select("freshness_warning_months, freshness_requote_months")
      .single(),
  ]);

  if (categoriesRes.error) throw categoriesRes.error;
  if (componentsRes.error) throw componentsRes.error;
  if (settingsRes.error) throw settingsRes.error;

  const components = componentsRes.data.map((c) => ({
    ...c,
    freshness: deriveFreshness(
      c.quoted_date,
      settingsRes.data.freshness_warning_months,
      settingsRes.data.freshness_requote_months,
    ),
  }));

  return (
    <PageBody>
      <PageHeader
        title="Component Library"
        description="Reusable components by category, with a full price history behind every cost change."
        actions={
          <AdminOnly>
            <Button asChild>
              <Link href="/library/new">New component</Link>
            </Button>
          </AdminOnly>
        }
        // Split from `actions` on purpose: the action slot is shrink-0 and
        // cannot carry a sentence (see page-header.tsx). Admins get the button
        // and no notice; reps get the notice and no button.
        notice={
          <AdminOnly fallback={<ReadOnlyNotice what="The component library" />}>
            {null}
          </AdminOnly>
        }
      />

      <ComponentTable components={components} categories={categoriesRes.data} />
    </PageBody>
  );
}
