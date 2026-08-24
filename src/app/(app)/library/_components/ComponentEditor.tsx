"use client";

import * as React from "react";

import { ReadOnlyNotice } from "@/components/layout/admin-only";
import { useIsAdmin } from "@/components/layout/role-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/lib/supabase/types";
type Category = Database["public"]["Tables"]["categories"]["Row"];
type EnvironmentType = Database["public"]["Enums"]["environment_type"];
type LibraryComponent = Database["public"]["Tables"]["components"]["Row"];
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveComponent } from "@/server/actions/library";
import {
  componentSchema,
  type ComponentInput,
} from "@/lib/validation/component";

/**
 * Component editor — PRD-006.
 *
 * The cost field is the only one whose change has a side effect: it appends a
 * `price_history` row in the same transaction (NFR-005). The design says so
 * under the field rather than in a confirmation dialog, because appending
 * history is not a decision the admin makes — it happens either way, and a
 * dialog would imply it were optional.
 *
 * `component === null` is create mode, mirroring `quote={null}` in the quote
 * builder and `product={null}` in the product editor. Cost, quoted date, and
 * labor hours start blank rather than at 0 — a pre-filled zero cost would save
 * as a real "free component" if left alone, and it would be the first
 * `price_history` row, which is append-only and cannot be corrected afterwards.
 */

const ENVIRONMENTS: { value: EnvironmentType; label: string; help: string }[] =
  [
    { value: "any", label: "Any", help: "Never flagged" },
    { value: "indoor", label: "Indoor", help: "Flagged on outdoor quotes" },
    { value: "outdoor", label: "Outdoor", help: "Flagged on indoor quotes" },
  ];

export function ComponentEditor({
  component,
  categories,
}: {
  component: LibraryComponent | null;
  categories: Category[];
}) {
  const isAdmin = useIsAdmin();
  const readOnly = !isAdmin;
  const isNew = component === null;

  const [active, setActive] = React.useState(component?.active ?? true);
  const [environment, setEnvironment] = React.useState<EnvironmentType>(
    component?.environment ?? "any",
  );

  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof ComponentInput | "root", string>>
  >({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (readOnly) return;

    setErrors({});
    const formData = new FormData(e.currentTarget);
    const costStr = formData.get("cost") as string;
    const hoursStr = formData.get("default_labor_hours") as string;

    const values = {
      id: component?.id,
      name: formData.get("name") as string,
      sku: formData.get("sku") as string,
      category_id: formData.get("category_id") as string,
      vendor: formData.get("vendor") as string,
      environment,
      cost: costStr ? parseFloat(costStr) : 0,
      default_labor_hours: hoursStr ? parseFloat(hoursStr) : 0,
      quoted_date: formData.get("quoted_date") as string,
      active,
    };

    const parsed = componentSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      const result = await saveComponent(parsed.data);
      if (!result.ok) {
        setErrors(result.errors);
        toast.error(result.errors.root || "Please fix the errors in the form.");
      } else {
        toast.success(component ? "Component saved" : "Component created");
        router.push("/library");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {readOnly ? <ReadOnlyNotice what="The component library" /> : null}

      <Card className="flex flex-col gap-5">
        <h2 className="text-md font-semibold tracking-tight">Component</h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="component-name" className="text-sm font-semibold">
              Name
            </label>
            <Input
              id="component-name"
              name="name"
              defaultValue={component?.name ?? ""}
              disabled={readOnly}
            />
            {errors.name && (
              <span className="text-xs text-destructive">{errors.name}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="component-sku" className="text-sm font-semibold">
              SKU
            </label>
            <Input
              id="component-sku"
              name="sku"
              defaultValue={component?.sku ?? ""}
              disabled={readOnly}
              className="font-mono"
            />
            {errors.sku && (
              <span className="text-xs text-destructive">{errors.sku}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Category</span>
            <Select
              name="category_id"
              defaultValue={component?.category_id}
              disabled={readOnly}
            >
              <SelectTrigger className="w-full" aria-label="Category">
                {/* Placeholder matters only in create mode — with no
                    `defaultValue` there is nothing for `SelectValue` to render,
                    so an unlabelled empty trigger is what you'd get. */}
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category_id && (
              <span className="text-xs text-destructive">
                {errors.category_id}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="component-vendor" className="text-sm font-semibold">
              Vendor
            </label>
            <Input
              id="component-vendor"
              name="vendor"
              defaultValue={component?.vendor ?? ""}
              disabled={readOnly}
            />
            {errors.vendor && (
              <span className="text-xs text-destructive">{errors.vendor}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="component-cost" className="text-sm font-semibold">
              Cost
            </label>
            <Input
              id="component-cost"
              name="cost"
              variant="editable"
              inputMode="decimal"
              defaultValue={component?.cost ?? ""}
              disabled={readOnly}
            />
            <span className="text-xs text-muted-foreground">
              Changing this appends a price-history row in the same transaction.
            </span>
            {errors.cost && (
              <span className="text-xs text-destructive">{errors.cost}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="component-date" className="text-sm font-semibold">
              Quoted date
            </label>
            <Input
              id="component-date"
              name="quoted_date"
              variant="editable"
              type="date"
              defaultValue={component?.quoted_date ?? ""}
              disabled={readOnly}
            />
            <span className="text-xs text-muted-foreground">
              Freshness is measured from this date against the thresholds in
              settings.
            </span>
            {errors.quoted_date && (
              <span className="text-xs text-destructive">
                {errors.quoted_date}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="component-hours" className="text-sm font-semibold">
              Default labor hours
            </label>
            <Input
              id="component-hours"
              name="default_labor_hours"
              variant="editable"
              inputMode="decimal"
              defaultValue={component?.default_labor_hours ?? ""}
              disabled={readOnly}
            />
            <span className="text-xs text-muted-foreground">
              Pre-filled on a quote line; a rep can override it per quote.
            </span>
            {errors.default_labor_hours && (
              <span className="text-xs text-destructive">
                {errors.default_labor_hours}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Environment</span>
            <RadioGroup
              value={environment}
              disabled={readOnly}
              onValueChange={(value) =>
                setEnvironment(value as EnvironmentType)
              }
              className="flex flex-col gap-2 py-1"
            >
              {ENVIRONMENTS.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <RadioGroupItem
                    value={option.value}
                    id={`component-env-${option.value}`}
                  />
                  <label
                    htmlFor={`component-env-${option.value}`}
                    className="text-sm select-none"
                  >
                    {option.label}
                    <span className="text-muted-foreground">
                      {" "}
                      · {option.help}
                    </span>
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <div className="flex items-start justify-between gap-6 border-t border-border pt-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Active</span>
            <p className="max-w-prose text-xs text-muted-foreground">
              {isNew
                ? "Active components are selectable on quote lines and eligible as a category default. Leave this on unless you are staging a component before it is ready to use."
                : "A deactivated component stays on quotes that already use it, priced as-is and marked deactivated, and is not selectable for new lines on any quote."}
            </p>
          </div>
          <Switch
            checked={active}
            onCheckedChange={setActive}
            disabled={readOnly}
            aria-label="Component active"
          />
        </div>
      </Card>

      {isAdmin ? (
        <div>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Saving..."
              : isNew
                ? "Create component"
                : "Save component"}
          </Button>
          {errors.root && (
            <p className="text-sm text-destructive mt-2">{errors.root}</p>
          )}
        </div>
      ) : null}
    </form>
  );
}
