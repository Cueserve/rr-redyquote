"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { DeactivatedBadge, FreshnessBadge } from "@/components/freshness-badge";
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
import { EmptyState } from "@/components/ui/empty-state";
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
            <p>No products match this filter.</p>
          </EmptyState>
        </div>
      ) : (
        <Table>
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
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/products/${product.id}`}
                      className="font-semibold"
                    >
                      {product.name}
                    </Link>
                    {!product.active ? <DeactivatedBadge /> : null}
                  </div>
                </TableCell>
                <TableCell numeric className="text-muted-foreground">
                  {product.sku}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {product.vendor ?? "—"}
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

      <p className="text-xs text-muted-foreground">
        Showing {rows.length} of {products.length} products.
      </p>
    </div>
  );
}
