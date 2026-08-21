import { notFound } from "next/navigation";

import { PageBody, PageHeader } from "@/components/layout/page-header";
import { DeactivatedBadge, FreshnessBadge } from "@/components/freshness-badge";
import { Card } from "@/components/ui/card";
import { EmptyState, EmptyValue } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { deriveFreshness } from "@/lib/freshness";

import { ComponentEditor } from "../_components/ComponentEditor";

export default async function ComponentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [componentRes, historyRes, categoriesRes, settingsRes] =
    await Promise.all([
      supabase.from("components").select("*").eq("id", id).single(),
      supabase
        .from("price_history")
        .select("*, profiles!price_history_changed_by_fkey(full_name)")
        .eq("component_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("sort_order"),
      supabase
        .from("settings")
        .select("freshness_warning_months, freshness_requote_months")
        .single(),
    ]);

  if (componentRes.error || !componentRes.data) notFound();

  const componentRaw = componentRes.data;
  const freshness = deriveFreshness(
    componentRaw.quoted_date,
    settingsRes.data?.freshness_warning_months ?? 3,
    settingsRes.data?.freshness_requote_months ?? 6,
  );

  const component = { ...componentRaw, freshness };
  const history = historyRes.data ?? [];
  const categories = categoriesRes.data ?? [];
  const category = categories.find((c) => c.id === component.category_id);

  return (
    <PageBody>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {component.name}
            {!component.active ? <DeactivatedBadge /> : null}
          </span>
        }
        description={`${category?.name ?? "Uncategorised"} · ${component.sku}`}
      />

      <div className="grid grid-cols-1 gap-6 xl:flex xl:items-start">
        <div className="min-w-0 xl:flex-1">
          <ComponentEditor component={component} categories={categories} />
        </div>

        {/* NFR-005 — `price_history` is append-only and written in the same
            transaction as the cost change. Rendering it read-only, with no
            edit or delete affordance anywhere, is the design expressing that:
            there is no UI for changing history because there is no way to. */}
        <Card
          // 30rem, not w-96 (24rem): the four-column history table needs 442px
          // and w-96 gave it 348px, so it scrolled horizontally at xl and above
          // while fitting fine below xl, where the grid stacks. The wider
          // viewport produced the worse result. The 96px comes off the editor
          // column, which still clears its two-column field grid at 660px.
          className="flex flex-col gap-4 xl:w-[30rem] xl:shrink-0"
          padding="compact"
        >
          <div className="flex flex-col gap-1 px-2 pt-2">
            <h2 className="text-md font-semibold tracking-tight">
              Price History
            </h2>
            <p className="max-w-[70ch] text-sm text-muted-foreground">
              Append-only. A cost change adds a row; it never rewrites one.
            </p>
          </div>

          {history.length === 0 ? (
            <EmptyState size="sm">
              <p>No cost changes recorded yet.</p>
            </EmptyState>
          ) : (
            <Table caption="Cost change history for this component">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Quoted</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Recorded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell numeric className="text-right font-semibold">
                      <span className="flex items-center justify-end gap-2">
                        {formatMoney(row.cost)}
                        {index === 0 ? (
                          <FreshnessBadge freshness={component.freshness} />
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell numeric className="text-muted-foreground">
                      {formatDate(row.quoted_date)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.vendor ?? <EmptyValue label="No vendor" />}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(row.created_at)}
                      <br />
                      {row.profiles?.full_name ?? "Unknown User"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </PageBody>
  );
}
