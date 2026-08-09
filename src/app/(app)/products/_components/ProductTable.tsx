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

// Search and the deactivated toggle are local state over rows the Server
// Component already fetched — no round trip to filter a visible list.
//
// Deactivated products are hidden by default rather than dropped: PRD-018 makes
// deactivation a soft state, so they must stay reachable and viewable.

export function ProductTable({ products }: { products: Product[] }) {
  const [query, setQuery] = React.useState("");
  const [showDeactivated, setShowDeactivated] = React.useState(false);

  const needle = query.trim().toLowerCase();
  const rows = products.filter((product) => {
    const matchesActive = showDeactivated || product.active;
    const matchesQuery =
      needle === "" ||
      product.name.toLowerCase().includes(needle) ||
      product.sku.toLowerCase().includes(needle) ||
      (product.vendor ?? "").toLowerCase().includes(needle);
    return matchesActive && matchesQuery;
  });

  // An empty result has two possible causes and the copy has to name the one in
  // play, because one of them is invisible: the deactivated toggle is off by
  // default (PRD-018 keeps deactivation soft), so a rep searching for a
  // deactivated product by name hits a dead end with nothing on screen
  // explaining why it isn't there.
  const hiddenByToggle = !showDeactivated && products.some((p) => !p.active);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, SKU, or vendor"
            aria-label="Search products"
            className="w-80 pl-9"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={showDeactivated}
            onCheckedChange={setShowDeactivated}
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
                {needle === ""
                  ? "No active products."
                  : `No ${showDeactivated ? "" : "active "}products match “${query.trim()}”.`}
              </p>
            )}
            {needle !== "" || hiddenByToggle ? (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                {needle !== "" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuery("")}
                  >
                    Clear search
                  </Button>
                ) : null}
                {hiddenByToggle ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeactivated(true)}
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
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Assembly hrs</TableHead>
              <TableHead className="text-right">Tiers</TableHead>
              <TableHead>Fab pricing</TableHead>
              <TableHead>Updated</TableHead>
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

      {/* `role="status"` (polite + atomic) is what makes the filter audible:
          search and the toggle rewrite the table with no page navigation, so
          without a live region a screen-reader user gets no confirmation the
          list changed, or that it went empty (WCAG 2.2 4.1.3). This sentence is
          already the right one -- it needs the role, not new copy. */}
      <p role="status" className="text-xs text-muted-foreground">
        Showing {rows.length} of {products.length} products.
      </p>
    </div>
  );
}
