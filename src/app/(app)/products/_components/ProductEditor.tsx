"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

import { FreshnessBadge } from "@/components/freshness-badge";
import { useIsAdmin } from "@/components/prototype/role-context";
import { ReadOnlyNotice } from "@/components/prototype/admin-only";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import type {
  Category,
  FabTier,
  LibraryComponent,
  Product,
  ProductDefault,
} from "@/lib/mock";

/**
 * Product editor — PRD-003 (product fields), PRD-004 (quantity-tier fab
 * pricing), PRD-005 (a default component per category).
 *
 * All three save together. PRD-015 makes the product row, its tiers, its
 * defaults, and the `price_history` rows for any changed tier cost a single
 * atomic write, which is why this is one form with one Save button rather than
 * three independently-savable cards. The design has to make that atomicity
 * legible — a per-card save button would imply partial writes the architecture
 * specifically forbids (ARCHITECTURE.md §3, PRODUCT.md §6).
 *
 * Cost and quoted-date fields carry the editable treatment (amber tint + border
 * + mono digits, DESIGN-SYSTEM.md §7); everything the system derives does not.
 */
export function ProductEditor({
  product,
  tiers,
  defaults,
  categories,
  components,
}: {
  product: Product;
  tiers: FabTier[];
  defaults: ProductDefault[];
  categories: Category[];
  components: LibraryComponent[];
}) {
  const isAdmin = useIsAdmin();
  const readOnly = !isAdmin;

  const [active, setActive] = React.useState(product.active);

  return (
    <div className="flex flex-col gap-6">
      {readOnly ? <ReadOnlyNotice what="The product catalog" /> : null}

      <Card className="flex flex-col gap-5">
        <h2 className="text-md font-semibold tracking-tight">Product</h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Name" htmlFor="product-name">
            <Input
              id="product-name"
              defaultValue={product.name}
              disabled={readOnly}
            />
          </Field>

          <Field label="SKU" htmlFor="product-sku">
            <Input
              id="product-sku"
              defaultValue={product.sku}
              disabled={readOnly}
              className="font-mono"
            />
          </Field>

          <Field label="Vendor" htmlFor="product-vendor">
            <Input
              id="product-vendor"
              defaultValue={product.vendor ?? ""}
              disabled={readOnly}
            />
          </Field>

          <Field
            label="Estimated assembly hours"
            htmlFor="product-hours"
            help="Applied to the quote in addition to per-line labor hours."
          >
            <Input
              id="product-hours"
              variant="editable"
              inputMode="decimal"
              defaultValue={product.est_labor_hours}
              disabled={readOnly}
            />
          </Field>

          <Field
            label="Description"
            htmlFor="product-description"
            className="md:col-span-2"
          >
            <Input
              id="product-description"
              defaultValue={product.description ?? ""}
              disabled={readOnly}
            />
          </Field>
        </div>

        <div className="flex items-start justify-between gap-6 border-t border-border pt-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Active</span>
            <p className="max-w-prose text-xs text-muted-foreground">
              Deactivating is a soft state. This product stays on quotes that
              already reference it, priced as-is and marked deactivated, but is
              not selectable for new quotes.
            </p>
          </div>
          <Switch
            checked={active}
            onCheckedChange={setActive}
            disabled={readOnly}
            aria-label="Product active"
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-4" padding="compact">
        <div className="flex items-start justify-between gap-4 px-2 pt-2">
          <div className="flex flex-col gap-1">
            <h2 className="text-md font-semibold tracking-tight">
              Quantity-tier fab pricing
            </h2>
            <p className="text-sm text-muted-foreground">
              Changing a cost appends a row to price history — it never
              overwrites the old one.
            </p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32 text-right">Qty tier</TableHead>
              <TableHead className="w-36 text-right">Cost</TableHead>
              <TableHead className="w-44">Quoted date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="w-32">Freshness</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">Row actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.map((tier) => (
              <TableRow key={tier.id}>
                <TableCell numeric className="text-right">
                  <Input
                    variant="editable"
                    inputMode="numeric"
                    defaultValue={tier.qty_tier}
                    disabled={readOnly}
                    aria-label="Quantity tier"
                    className="h-8 w-full px-2 py-1 text-right text-sm"
                  />
                </TableCell>
                <TableCell numeric className="text-right">
                  <Input
                    variant="editable"
                    inputMode="decimal"
                    defaultValue={tier.cost}
                    disabled={readOnly}
                    aria-label="Tier cost"
                    className="h-8 w-full px-2 py-1 text-right text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    variant="editable"
                    type="date"
                    defaultValue={tier.quoted_date}
                    disabled={readOnly}
                    aria-label="Quoted date"
                    className="h-8 w-full px-2 py-1 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    defaultValue={tier.vendor ?? ""}
                    disabled={readOnly}
                    aria-label="Tier vendor"
                    className="h-8 w-full px-2 py-1 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <FreshnessBadge
                    freshness={tier.freshness}
                    quotedDate={tier.quoted_date}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={readOnly}
                    aria-label="Remove tier"
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="px-2 pb-2">
          <Button variant="outline" size="sm" disabled={readOnly}>
            <Plus />
            Add tier
          </Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-md font-semibold tracking-tight">
            Default components
          </h2>
          <p className="text-sm text-muted-foreground">
            Pre-filled on every new quote for this product. A rep can change any
            of them on the quote itself.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {categories.map((category) => {
            const current =
              defaults.find((entry) => entry.category_id === category.id)
                ?.component_id ?? "none";
            const options = components.filter(
              (component) =>
                component.category_id === category.id &&
                (component.active || component.id === current),
            );

            return (
              <div key={category.id} className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold">{category.name}</span>
                <Select defaultValue={current} disabled={readOnly}>
                  <SelectTrigger
                    className="w-full"
                    aria-label={`${category.name} default component`}
                  >
                    <SelectValue placeholder="No default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No default</SelectItem>
                    {options.map((component) => (
                      <SelectItem key={component.id} value={component.id}>
                        {component.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      </Card>

      {isAdmin ? (
        <div className="flex items-center gap-3">
          <Button>Save product</Button>
          <p className="text-xs text-muted-foreground">
            Product, tiers, defaults, and any price-history rows are written in
            one transaction — all of it saves, or none of it does.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  help,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  help?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={htmlFor} className="text-sm font-semibold">
          {label}
        </label>
        {children}
        {/* One calm sentence under the control, never a tooltip standing in for
            real labelling (DESIGN-SYSTEM.md §11). */}
        {help ? (
          <span className="text-xs text-muted-foreground">{help}</span>
        ) : null}
      </div>
    </div>
  );
}
