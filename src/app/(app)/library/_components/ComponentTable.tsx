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
import { EmptyState } from "@/components/ui/empty-state";
import type { Category, LibraryComponent } from "@/lib/mock";
import { formatDate, formatHours, formatMoney } from "@/lib/utils";

// Environment is a Badge rather than plain text so the Indoor/Outdoor split
// scans down the column — it is the field a rep gets wrong, and PRD-008 makes a
// mismatch a flag on the quote rather than an error, so catching it here is
// cheaper than catching it there.
const ENVIRONMENT: Record<
  LibraryComponent["environment"],
  { label: string; variant: "secondary" | "info" | "warning" }
> = {
  any: { label: "Any", variant: "secondary" },
  indoor: { label: "Indoor", variant: "info" },
  outdoor: { label: "Outdoor", variant: "warning" },
};

export function ComponentTable({
  components,
  categories,
}: {
  components: LibraryComponent[];
  categories: Category[];
}) {
  const [query, setQuery] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("all");
  const [showDeactivated, setShowDeactivated] = React.useState(false);

  const categoryName = React.useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const needle = query.trim().toLowerCase();
  const rows = components.filter((component) => {
    const matchesCategory =
      categoryId === "all" || component.category_id === categoryId;
    const matchesActive = showDeactivated || component.active;
    const matchesQuery =
      needle === "" ||
      component.name.toLowerCase().includes(needle) ||
      component.sku.toLowerCase().includes(needle) ||
      (component.vendor ?? "").toLowerCase().includes(needle);
    return matchesCategory && matchesActive && matchesQuery;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, SKU, or vendor"
              aria-label="Search components"
              className="w-80 pl-9"
            />
          </div>

          <Select value={categoryId} onValueChange={setCategoryId}>
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
            onCheckedChange={setShowDeactivated}
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
              <TableHead>Component</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Labor hrs</TableHead>
              <TableHead>Quoted</TableHead>
              <TableHead>Freshness</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((component) => {
              const environment = ENVIRONMENT[component.environment];
              return (
                <TableRow key={component.id}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/library/${component.id}`}
                          className="font-semibold"
                        >
                          {component.name}
                        </Link>
                        {!component.active ? <DeactivatedBadge /> : null}
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {component.sku}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {categoryName.get(component.category_id) ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {component.vendor ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={environment.variant}>
                      {environment.label}
                    </Badge>
                  </TableCell>
                  <TableCell numeric className="text-right">
                    {formatMoney(component.cost)}
                  </TableCell>
                  <TableCell numeric className="text-right">
                    {formatHours(component.default_labor_hours)}
                  </TableCell>
                  <TableCell numeric className="text-muted-foreground">
                    {formatDate(component.quoted_date)}
                  </TableCell>
                  <TableCell>
                    <FreshnessBadge
                      freshness={component.freshness}
                      quotedDate={component.quoted_date}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <p className="text-xs text-muted-foreground">
        Showing {rows.length} of {components.length} components.
      </p>
    </div>
  );
}
