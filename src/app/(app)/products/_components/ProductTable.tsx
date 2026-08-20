"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { DeactivatedBadge, FreshnessBadge } from "@/components/freshness-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import type { Product } from "@/lib/mock";
import { formatDate, formatHours } from "@/lib/utils";
import {
  applyListView,
  byField,
  compareNumber,
  compareText,
} from "@/lib/list/apply-list-view";
import type { ListParamsConfig } from "@/lib/list/list-params";
import { useListParams } from "@/lib/list/use-list-params";
import { Pagination } from "@/components/ui/pagination";

// Search and the deactivated toggle are local state over rows the Server
// Component already fetched — no round trip to filter a visible list.
//
// Deactivated products are hidden by default rather than dropped: PRD-018 makes
// deactivation a soft state, so they must stay reachable and viewable.

// Sortable columns for this screen. `Fab pricing` is absent on purpose: it is a
// worst-across-tiers badge, and its rank order is meaningful only as a badge,
// not as a column sequence (design spec §3.3).
type ProductSortKey =
  "name" | "sku" | "vendor" | "assembly_hours" | "tiers" | "updated";

// Every selector annotates its own parameter (`row: Product`). Leaving it to
// inference makes `byField`'s `T` depend on the contextual return type, which
// is fragile enough that a refactor can silently produce `any`.
const SORTS: Record<
  ProductSortKey,
  (dir: "asc" | "desc") => (a: Product, b: Product) => number
> = {
  name: (dir) => byField((row: Product) => row.name, compareText, dir),
  sku: (dir) => byField((row: Product) => row.sku, compareText, dir),
  vendor: (dir) => byField((row: Product) => row.vendor, compareText, dir),
  assembly_hours: (dir) =>
    byField((row: Product) => row.est_labor_hours, compareNumber, dir),
  tiers: (dir) => byField((row: Product) => row.tier_count, compareNumber, dir),
  // `updated_at` is an ISO string, so lexical order IS chronological order.
  updated: (dir) => byField((row: Product) => row.updated_at, compareText, dir),
};

// Hoisted to module scope, not built inline: `useListParams` memoises on it,
// and a fresh object every render would rebuild every callback every render.
const LIST_CONFIG: ListParamsConfig<ProductSortKey> = {
  sortKeys: Object.keys(SORTS) as ProductSortKey[],
  // A rep opens the catalog to look up a known name (spec D5).
  defaultSort: "name",
  defaultDir: "asc",
  filterDefaults: { deactivated: "0" },
};

export function ProductTable({ products }: { products: Product[] }) {
  const list = useListParams(LIST_CONFIG);
  const { params } = list;
  const showDeactivated = list.filter("deactivated", "0") === "1";

  const needle = params.q.toLowerCase();
  const view = applyListView(products, {
    filter: (product) => {
      const matchesActive = showDeactivated || product.active;
      const matchesQuery =
        needle === "" ||
        product.name.toLowerCase().includes(needle) ||
        product.sku.toLowerCase().includes(needle) ||
        (product.vendor ?? "").toLowerCase().includes(needle);
      return matchesActive && matchesQuery;
    },
    compare: SORTS[params.sort](params.dir),
    page: params.page,
    size: params.size,
  });

  const rows = view.rows;

  // An empty result has two possible causes and the copy has to name the one in
  // play, because one of them is invisible: the deactivated toggle is off by
  // default (PRD-018 keeps deactivation soft), so a rep searching for a
  // deactivated product by name hits a dead end with nothing on screen
  // explaining why it isn't there.
  const hiddenByToggle = !showDeactivated && products.some((p) => !p.active);

  const firstRow =
    params.size === "all" ? 1 : (view.page - 1) * params.size + 1;
  const lastRow = firstRow + rows.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={list.query}
            onChange={(event) => list.setQuery(event.target.value)}
            placeholder="Search name, SKU, or vendor"
            aria-label="Search products"
            className="w-80 pl-9"
          />
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
            {products.length === 0 ? (
              <p>No products yet.</p>
            ) : (
              <p>
                {params.q === ""
                  ? "No active products."
                  : `No ${showDeactivated ? "" : "active "}products match “${params.q}”.`}
              </p>
            )}
            {needle !== "" || hiddenByToggle ? (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                {needle !== "" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => list.setQuery("")}
                  >
                    Clear search
                  </Button>
                ) : null}
                {hiddenByToggle ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => list.setFilter("deactivated", "1")}
                  >
                    Show deactivated
                  </Button>
                ) : null}
              </div>
            ) : null}
          </EmptyState>
        </div>
      ) : (
        <Table caption="Products">
          <TableHeader>
            <TableRow>
              <TableHead
                sortKey="name"
                sortState={list.sortStateFor("name")}
                onSort={(key) => list.toggleSort(key as ProductSortKey)}
              >
                Product
              </TableHead>
              <TableHead
                sortKey="sku"
                sortState={list.sortStateFor("sku")}
                onSort={(key) => list.toggleSort(key as ProductSortKey)}
              >
                SKU
              </TableHead>
              <TableHead
                sortKey="vendor"
                sortState={list.sortStateFor("vendor")}
                onSort={(key) => list.toggleSort(key as ProductSortKey)}
              >
                Vendor
              </TableHead>
              <TableHead
                className="text-right"
                sortKey="assembly_hours"
                sortState={list.sortStateFor("assembly_hours")}
                onSort={(key) => list.toggleSort(key as ProductSortKey)}
              >
                Assembly hrs
              </TableHead>
              <TableHead
                className="text-right"
                sortKey="tiers"
                sortState={list.sortStateFor("tiers")}
                onSort={(key) => list.toggleSort(key as ProductSortKey)}
              >
                Tiers
              </TableHead>
              <TableHead>Fab pricing</TableHead>
              <TableHead
                sortKey="updated"
                sortState={list.sortStateFor("updated")}
                onSort={(key) => list.toggleSort(key as ProductSortKey)}
              >
                Updated
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((product) => (
              <TableRow key={product.id}>
                {/* The row's name cell, so cell-by-cell navigation says which
                    product each value belongs to. */}
                <TableCell header>
                  <div className="flex items-center gap-2">
                    {/* `LinkPending` must live inside the Link — it reads that
                        Link's navigation status. The detail route has no
                        `loading.tsx` on purpose (it would turn a 404 into a
                        200), so this is the only click feedback the row has. */}
                    <Link
                      href={`/products/${product.id}`}
                      className="inline-flex items-center gap-1.5 font-semibold"
                    >
                      {product.name}
                      <LinkPending label={`Opening ${product.name}`} />
                    </Link>
                    {!product.active ? <DeactivatedBadge /> : null}
                  </div>
                </TableCell>
                <TableCell numeric className="text-muted-foreground">
                  {product.sku}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {product.vendor ?? <EmptyValue label="No vendor" />}
                </TableCell>
                <TableCell numeric className="text-right">
                  {formatHours(product.est_labor_hours)}
                </TableCell>
                <TableCell numeric className="text-right">
                  {product.tier_count}
                </TableCell>
                <TableCell>
                  {/* Worst freshness across the product's tiers — one glance
                      tells an admin whether anything here needs re-quoting. */}
                  <FreshnessBadge freshness={product.worst_tier_freshness} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(product.updated_at)}
                </TableCell>
              </TableRow>
            ))}
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

      {/* `role="status"` (polite + atomic) is what makes the filter audible:
          search, the toggle, a sort click and a page turn all rewrite the table
          with no page navigation, so without a live region a screen-reader user
          gets no confirmation the list changed, or that it went empty (WCAG 2.2
          4.1.3). It is also why the pager carries no live region of its own. */}
      <p role="status" className="text-xs text-muted-foreground">
        {view.total === 0
          ? `Showing 0 of ${products.length} products.`
          : `Showing ${firstRow} to ${lastRow} of ${view.total} products.`}
      </p>
    </div>
  );
}
