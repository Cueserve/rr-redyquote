"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { DeactivatedBadge, FreshnessBadge } from "@/components/freshness-badge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import { EmptyState, EmptyValue } from "@/components/ui/empty-state";
import { LinkPending } from "@/components/ui/link-pending";
import type { Tables } from "@/lib/supabase/types";
import type { Freshness } from "@/lib/freshness";

export type LibraryComponentRow = Tables<"components"> & {
  freshness: Freshness;
};
import { formatDate, formatHours, formatMoney } from "@/lib/utils";
import {
  applyListView,
  byField,
  compareNumber,
  compareRank,
  compareText,
} from "@/lib/list/apply-list-view";
import type { ListParamsConfig } from "@/lib/list/list-params";
import { useListParams } from "@/lib/list/use-list-params";
import { Pagination } from "@/components/ui/pagination";

// Environment is a Badge rather than plain text so the Indoor/Outdoor split
// scans down the column — it is the field a rep gets wrong, and PRD-008 makes a
// mismatch a flag on the quote rather than an error, so catching it here is
// cheaper than catching it there.
const ENVIRONMENT: Record<
  LibraryComponentRow["environment"],
  { label: string; variant: "secondary" | "info" | "warning" }
> = {
  any: { label: "Any", variant: "secondary" },
  indoor: { label: "Indoor", variant: "info" },
  outdoor: { label: "Outdoor", variant: "warning" },
};

// `Environment` is absent from the sortable keys on purpose: Any/Indoor/Outdoor
// is a classification, not a scale, so any order it produces is arbitrary
// (design spec §3.3).
type ComponentSortKey =
  | "name"
  | "category"
  | "vendor"
  | "cost"
  | "labor_hours"
  | "quoted"
  | "freshness";

/** PRD-009's three states, in severity order — never alphabetical. */
const FRESHNESS_ORDER = ["current", "aging", "requote"] as const;

// Category sorts by display name, which needs the id→name map the component
// already builds. Passing it in keeps every comparator a pure function of its
// row rather than closing over component state.
function sortsFor(
  categoryName: Map<string, string>,
): Record<
  ComponentSortKey,
  (
    dir: "asc" | "desc",
  ) => (a: LibraryComponentRow, b: LibraryComponentRow) => number
> {
  return {
    name: (dir) =>
      byField((row: LibraryComponentRow) => row.name, compareText, dir),
    category: (dir) =>
      byField(
        (row: LibraryComponentRow) => categoryName.get(row.category_id),
        compareText,
        dir,
      ),
    vendor: (dir) =>
      byField((row: LibraryComponentRow) => row.vendor, compareText, dir),
    cost: (dir) =>
      byField((row: LibraryComponentRow) => row.cost, compareNumber, dir),
    labor_hours: (dir) =>
      byField(
        (row: LibraryComponentRow) => row.default_labor_hours,
        compareNumber,
        dir,
      ),
    // `quoted_date` is an ISO date string, so lexical order is chronological.
    quoted: (dir) =>
      byField((row: LibraryComponentRow) => row.quoted_date, compareText, dir),
    freshness: (dir) =>
      byField(
        (row: LibraryComponentRow) => row.freshness,
        compareRank(FRESHNESS_ORDER),
        dir,
      ),
  };
}

const SORT_KEYS: ComponentSortKey[] = [
  "name",
  "category",
  "vendor",
  "cost",
  "labor_hours",
  "quoted",
  "freshness",
];

const LIST_CONFIG: ListParamsConfig<ComponentSortKey> = {
  sortKeys: SORT_KEYS,
  defaultSort: "name",
  defaultDir: "asc",
  filterDefaults: { category: "all", deactivated: "0" },
};

export function ComponentTable({
  components,
  categories,
}: {
  components: LibraryComponentRow[];
  categories: Tables<"categories">[];
}) {
  const list = useListParams(LIST_CONFIG);
  const { params } = list;
  const categoryId = list.filter("category", "all");
  const showDeactivated = list.filter("deactivated", "0") === "1";

  const categoryName = React.useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const compare = React.useMemo(
    () => sortsFor(categoryName)[params.sort](params.dir),
    [categoryName, params.dir, params.sort],
  );

  const needle = params.q.toLowerCase();
  const view = applyListView(components, {
    filter: (component) => {
      const matchesCategory =
        categoryId === "all" || component.category_id === categoryId;
      const matchesActive = showDeactivated || component.active;
      const matchesQuery =
        needle === "" ||
        component.name.toLowerCase().includes(needle) ||
        component.sku.toLowerCase().includes(needle) ||
        (component.vendor ?? "").toLowerCase().includes(needle);
      return matchesCategory && matchesActive && matchesQuery;
    },
    compare,
    page: params.page,
    size: params.size,
  });

  const rows = view.rows;
  const firstRow =
    params.size === "all" ? 1 : (view.page - 1) * params.size + 1;
  const lastRow = firstRow + rows.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* The 320px width belongs to the wrapper, not the Input, and only
              from `sm` up: as a flat `w-80` on the Input it could not shrink,
              so below ~430px of content it pushed the toolbar wider than the
              scroll container and `main` gained a horizontal scrollbar. Under
              `sm` it now fills the row instead. No change at any width PRD
              NFR-008 actually supports (≥768px); this is defence against the
              layout breaking silently outside that range. */}
          <div className="relative w-full sm:w-80">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={list.query}
              onChange={(event) => list.setQuery(event.target.value)}
              placeholder="Search name, SKU, or vendor"
              aria-label="Search components"
              className="pl-9"
            />
          </div>

          <Select
            value={categoryId}
            onValueChange={(next) =>
              list.setFilter("category", next === "all" ? null : next)
            }
          >
            <SelectTrigger aria-label="Filter by category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={showDeactivated}
            onCheckedChange={(checked) =>
              list.setFilter("deactivated", checked ? "1" : null)
            }
          />
          Show deactivated
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-border">
          <EmptyState>
            <p>No components match this filter.</p>
          </EmptyState>
        </div>
      ) : (
        <Table caption="Component library">
          <TableHeader>
            <TableRow>
              <TableHead
                sortKey="name"
                sortState={list.sortStateFor("name")}
                onSort={(key) => list.toggleSort(key as ComponentSortKey)}
              >
                Component
              </TableHead>
              <TableHead
                sortKey="category"
                sortState={list.sortStateFor("category")}
                onSort={(key) => list.toggleSort(key as ComponentSortKey)}
              >
                Category
              </TableHead>
              <TableHead
                sortKey="vendor"
                sortState={list.sortStateFor("vendor")}
                onSort={(key) => list.toggleSort(key as ComponentSortKey)}
              >
                Vendor
              </TableHead>
              <TableHead>Environment</TableHead>
              <TableHead
                className="text-right"
                sortKey="cost"
                sortState={list.sortStateFor("cost")}
                onSort={(key) => list.toggleSort(key as ComponentSortKey)}
              >
                Cost
              </TableHead>
              <TableHead
                className="text-right"
                sortKey="labor_hours"
                sortState={list.sortStateFor("labor_hours")}
                onSort={(key) => list.toggleSort(key as ComponentSortKey)}
              >
                Labor hrs
              </TableHead>
              <TableHead
                sortKey="quoted"
                sortState={list.sortStateFor("quoted")}
                onSort={(key) => list.toggleSort(key as ComponentSortKey)}
              >
                Quoted
              </TableHead>
              <TableHead
                sortKey="freshness"
                sortState={list.sortStateFor("freshness")}
                onSort={(key) => list.toggleSort(key as ComponentSortKey)}
              >
                Freshness
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((component) => {
              const environment = ENVIRONMENT[component.environment];
              return (
                <TableRow key={component.id}>
                  {/* The row's name cell, so cell-by-cell navigation says which
                      component each value belongs to. Matches ProductTable. */}
                  <TableCell header>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {/* `LinkPending` must live inside the Link — it reads
                            that Link's navigation status. The detail route has
                            no `loading.tsx` on purpose (it would turn a 404
                            into a 200), so this is the row's only click
                            feedback. */}
                        <Link
                          href={`/library/${component.id}`}
                          className="inline-flex items-center gap-1.5 font-semibold"
                        >
                          {component.name}
                          <LinkPending label={`Opening ${component.name}`} />
                        </Link>
                        {!component.active ? <DeactivatedBadge /> : null}
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {component.sku}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {categoryName.get(component.category_id) ?? (
                      <EmptyValue label="Uncategorised" />
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {component.vendor ?? <EmptyValue label="No vendor" />}
                  </TableCell>
                  <TableCell>
                    <Badge variant={environment.variant}>
                      {environment.label}
                    </Badge>
                  </TableCell>
                  {/* Cost carries the weight: it is the number a rep scans this
                      table for, and at eight columns of identical treatment
                      nothing anchored the row. Matches how the price-history
                      table on /library/[id] already renders a cost cell. */}
                  <TableCell numeric className="text-right font-semibold">
                    {formatMoney(component.cost)}
                  </TableCell>
                  <TableCell
                    numeric
                    className="text-right text-muted-foreground"
                  >
                    {formatHours(component.default_labor_hours)}
                  </TableCell>
                  <TableCell numeric className="text-muted-foreground">
                    {formatDate(component.quoted_date)}
                  </TableCell>
                  <TableCell>
                    <FreshnessBadge freshness={component.freshness} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {view.total > 0 ? (
        <Pagination
          page={view.page}
          pageCount={view.pageCount}
          size={params.size}
          onPageChange={list.setPage}
          onSizeChange={list.setSize}
        />
      ) : null}

      {/* `role="status"` (polite + atomic) is what makes the filters audible:
          search, the category select, the toggle, a sort click and a page turn
          all rewrite the table with no page navigation, so without a live
          region a screen-reader user gets no confirmation the list changed, or
          that it went empty (WCAG 2.2 4.1.3). Matches ProductTable. */}
      <p role="status" className="text-xs text-muted-foreground">
        {view.total === 0
          ? `Showing 0 of ${components.length} components.`
          : `Showing ${firstRow} to ${lastRow} of ${view.total} components.`}
      </p>
    </div>
  );
}
