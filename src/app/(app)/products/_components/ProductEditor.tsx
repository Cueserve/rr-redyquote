"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { FreshnessBadge } from "@/components/freshness-badge";
import { useIsAdmin } from "@/components/layout/role-context";
import { ReadOnlyNotice } from "@/components/layout/admin-only";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
import type { Freshness } from "@/lib/freshness";
import type { Database } from "@/lib/supabase/types";
import { createProductSchema } from "@/lib/validation/product";
import { saveProduct } from "@/server/actions/product";

type Product = Database["public"]["Tables"]["products"]["Row"];
type FabTier = Database["public"]["Tables"]["fab_tiers"]["Row"] & {
  freshness: Freshness;
};
type ProductDefault = Database["public"]["Tables"]["product_defaults"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];
type LibraryComponent = Database["public"]["Tables"]["components"]["Row"];

export function ProductEditor({
  product,
  tiers,
  defaults,
  categories,
  components,
}: {
  product: Product | null;
  tiers: FabTier[];
  defaults: ProductDefault[];
  categories: Category[];
  components: LibraryComponent[];
}) {
  const isAdmin = useIsAdmin();
  const readOnly = !isAdmin;
  const isNew = product === null;
  const router = useRouter();

  const [active, setActive] = React.useState(product?.active ?? true);
  const [isPending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [localTiers, setLocalTiers] = React.useState(
    tiers.map((t) => ({ ...t, internalId: t.id })),
  );

  const [localDefaults, setLocalDefaults] = React.useState<
    Record<string, string>
  >(
    categories.reduce(
      (acc, cat) => {
        const def = defaults.find((d) => d.category_id === cat.id);
        if (def?.component_id) {
          acc[cat.id] = def.component_id;
        }
        return acc;
      },
      {} as Record<string, string>,
    ),
  );

  const addTier = () => {
    setLocalTiers([
      ...localTiers,
      {
        internalId: crypto.randomUUID(),
        id: "",
        qty_tier: "" as unknown as number,
        cost: "" as unknown as number,
        quoted_date: new Date().toISOString().split("T")[0],
        vendor: null,
        freshness: "current" as Freshness,
        product_id: product?.id || "",
        created_at: "",
        updated_at: "",
      },
    ]);
  };

  const removeTier = (internalId: string) => {
    setLocalTiers(localTiers.filter((t) => t.internalId !== internalId));
  };

  const updateTier = (internalId: string, field: string, value: unknown) => {
    setLocalTiers(
      localTiers.map((t) =>
        t.internalId === internalId ? { ...t, [field]: value } : t,
      ),
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (readOnly) return;

    setErrors({});
    const formData = new FormData(e.currentTarget);
    const estLabor = formData.get("est_labor_hours") as string;

    const values = {
      id: product?.id,
      name: formData.get("name") as string,
      sku: formData.get("sku") as string,
      description: (formData.get("description") as string) || null,
      vendor: (formData.get("vendor") as string) || null,
      est_labor_hours: estLabor ? parseFloat(estLabor) : 0,
      active,
      fab_tiers: localTiers.map((t) => ({
        id: t.id,
        qty_tier:
          typeof t.qty_tier === "number"
            ? t.qty_tier
            : parseInt(t.qty_tier) || 0,
        cost: typeof t.cost === "number" ? t.cost : parseFloat(t.cost) || 0,
        quoted_date: t.quoted_date,
        vendor: t.vendor || null,
      })),
      product_defaults: Object.entries(localDefaults).map(
        ([categoryId, componentId]) => ({
          category_id: categoryId,
          component_id: componentId === "none" ? null : componentId,
        }),
      ),
    };

    const parsed = createProductSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path.join(".")] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      const result = await saveProduct(parsed.data);
      if (!result.success) {
        if (result.errors) {
          const fieldErrors: Record<string, string> = {};
          for (const [key, issues] of Object.entries(result.errors)) {
            fieldErrors[key] = (issues as string[])[0];
          }
          setErrors(fieldErrors);
          toast.error("Please fix the errors in the form.");
        }
        if (result.message) {
          setErrors({ root: result.message });
          toast.error(result.message);
        }
      } else {
        toast.success(product ? "Product saved" : "Product created");
        router.push("/products");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {readOnly ? <ReadOnlyNotice what="The product catalog" /> : null}

      {errors.root && (
        <div className="rounded bg-destructive/10 p-3 text-sm text-destructive font-semibold">
          {errors.root}
        </div>
      )}

      <Card className="flex flex-col gap-5">
        <h2 className="text-md font-semibold tracking-tight">Product</h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Name" htmlFor="product-name" error={errors["name"]}>
            <Input
              id="product-name"
              name="name"
              defaultValue={product?.name ?? ""}
              disabled={readOnly || isPending}
              required
            />
          </Field>

          <Field label="SKU" htmlFor="product-sku" error={errors["sku"]}>
            <Input
              id="product-sku"
              name="sku"
              defaultValue={product?.sku ?? ""}
              disabled={readOnly || isPending}
              className="font-mono"
              required
            />
          </Field>

          <Field
            label="Vendor"
            htmlFor="product-vendor"
            error={errors["vendor"]}
          >
            <Input
              id="product-vendor"
              name="vendor"
              defaultValue={product?.vendor ?? ""}
              disabled={readOnly || isPending}
            />
          </Field>

          <Field
            label="Estimated assembly hours"
            htmlFor="product-hours"
            help="Applied to the quote in addition to per-line labor hours."
            error={errors["est_labor_hours"]}
          >
            <Input
              id="product-hours"
              name="est_labor_hours"
              variant="editable"
              inputMode="decimal"
              defaultValue={product?.est_labor_hours ?? ""}
              disabled={readOnly || isPending}
            />
          </Field>

          <Field
            label="Description"
            htmlFor="product-description"
            className="md:col-span-2"
            error={errors["description"]}
          >
            <Input
              id="product-description"
              name="description"
              defaultValue={product?.description ?? ""}
              disabled={readOnly || isPending}
            />
          </Field>
        </div>

        <div className="flex items-start justify-between gap-6 border-t border-border pt-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Active</span>
            <p className="max-w-prose text-xs text-muted-foreground">
              {isNew
                ? "Active products are selectable on new quotes. Leave this on unless you are staging a product before it is ready to sell."
                : "Deactivating is a soft state. This product stays on quotes that already reference it, priced as-is and marked deactivated, but is not selectable for new quotes."}
            </p>
          </div>
          <Switch
            checked={active}
            onCheckedChange={setActive}
            disabled={readOnly || isPending}
            aria-label="Product active"
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-4" padding="compact">
        <div className="flex items-start justify-between gap-4 px-3 pt-2">
          <div className="flex flex-col gap-1">
            <h2 className="text-md font-semibold tracking-tight">
              Quantity-Tier Fab Pricing
            </h2>
            <p className="text-sm text-muted-foreground">
              Changing a cost appends a row to price history — it never
              overwrites the old one.
            </p>
          </div>
        </div>

        {localTiers.length === 0 ? (
          <EmptyState size="sm">
            <p>
              No fab pricing tiers yet. Add one below — a product with no tiers
              cannot be priced on a quote.
            </p>
          </EmptyState>
        ) : (
          <Table caption="Fabrication pricing tiers for this product">
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
              {localTiers.map((tier) => (
                <TableRow key={tier.internalId}>
                  <TableCell numeric className="text-right">
                    <Input
                      variant="editable"
                      inputMode="numeric"
                      value={tier.qty_tier}
                      onChange={(e) =>
                        updateTier(tier.internalId, "qty_tier", e.target.value)
                      }
                      disabled={readOnly || isPending}
                      aria-label="Quantity tier"
                      className="h-8 w-full px-2 py-1 text-right text-sm"
                    />
                  </TableCell>
                  <TableCell numeric className="text-right">
                    <Input
                      variant="editable"
                      inputMode="decimal"
                      value={tier.cost}
                      onChange={(e) =>
                        updateTier(tier.internalId, "cost", e.target.value)
                      }
                      disabled={readOnly || isPending}
                      aria-label="Tier cost"
                      className="h-8 w-full px-2 py-1 text-right text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      variant="editable"
                      type="date"
                      value={tier.quoted_date}
                      onChange={(e) =>
                        updateTier(
                          tier.internalId,
                          "quoted_date",
                          e.target.value,
                        )
                      }
                      disabled={readOnly || isPending}
                      aria-label="Quoted date"
                      className="h-8 w-full px-2 py-1 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={tier.vendor ?? ""}
                      onChange={(e) =>
                        updateTier(tier.internalId, "vendor", e.target.value)
                      }
                      disabled={readOnly || isPending}
                      aria-label="Tier vendor"
                      className="h-8 w-full px-2 py-1 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <FreshnessBadge freshness={tier.freshness} />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeTier(tier.internalId)}
                      disabled={readOnly || isPending}
                      aria-label="Remove tier"
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="px-2 pb-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTier}
            disabled={readOnly || isPending}
          >
            <Plus />
            Add tier
          </Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-md font-semibold tracking-tight">
            Default Components
          </h2>
          <p className="text-sm text-muted-foreground">
            Pre-filled on every new quote for this product. A rep can change any
            of them on the quote itself.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {categories.map((category) => {
            const current = localDefaults[category.id] ?? "none";
            const options = components.filter(
              (component) =>
                component.category_id === category.id &&
                (component.active || component.id === current),
            );

            return (
              <div key={category.id} className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold">{category.name}</span>
                <Select
                  value={current}
                  onValueChange={(val) =>
                    setLocalDefaults({ ...localDefaults, [category.id]: val })
                  }
                  disabled={readOnly || isPending}
                >
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
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Saving..."
              : isNew
                ? "Create product"
                : "Save product"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Product, tiers, defaults, and any price-history rows are written in
            one transaction — all of it saves, or none of it does.
          </p>
        </div>
      ) : null}
    </form>
  );
}

function Field({
  label,
  htmlFor,
  help,
  className,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  help?: string;
  className?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={htmlFor} className="text-sm font-semibold">
          {label}
        </label>
        {children}
        {error ? (
          <span className="text-xs font-semibold text-destructive">
            {error}
          </span>
        ) : help ? (
          <span className="text-xs text-muted-foreground">{help}</span>
        ) : null}
      </div>
    </div>
  );
}
