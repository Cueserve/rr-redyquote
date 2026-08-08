import { notFound } from "next/navigation";

import { PageBody, PageHeader } from "@/components/layout/page-header";
import { DeactivatedBadge, FreshnessBadge } from "@/components/freshness-badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import {
  CATEGORIES,
  getCategory,
  getComponent,
  getPriceHistory,
} from "@/lib/mock";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";

import { ComponentEditor } from "../_components/ComponentEditor";

export default async function ComponentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const component = getComponent(id);
  if (!component) notFound();

  const history = getPriceHistory(component.id);
  const category = getCategory(component.category_id);

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
          <ComponentEditor component={component} categories={CATEGORIES} />
        </div>

        {/* NFR-005 — `price_history` is append-only and written in the same
            transaction as the cost change. Rendering it read-only, with no
            edit or delete affordance anywhere, is the design expressing that:
            there is no UI for changing history because there is no way to. */}
        <Card
          className="flex flex-col gap-4 xl:w-96 xl:shrink-0"
          padding="compact"
        >
          <div className="flex flex-col gap-1 px-2 pt-2">
            <h2 className="text-md font-semibold tracking-tight">
              Price History
            </h2>
            <p className="text-sm text-muted-foreground">
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
                          <FreshnessBadge
                            freshness={component.freshness}
                            quotedDate={row.quoted_date}
                          />
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell numeric className="text-muted-foreground">
                      {formatDate(row.quoted_date)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.vendor ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(row.created_at)}
                      <br />
                      {row.changed_by_name}
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
