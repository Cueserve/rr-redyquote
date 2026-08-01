"use client";

import * as React from "react";

import { ReadOnlyNotice } from "@/components/prototype/admin-only";
import { useIsAdmin } from "@/components/prototype/role-context";
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
import type { Category, EnvironmentType, LibraryComponent } from "@/lib/mock";

/**
 * Component editor — PRD-006.
 *
 * The cost field is the only one whose change has a side effect: it appends a
 * `price_history` row in the same transaction (NFR-005). The design says so
 * under the field rather than in a confirmation dialog, because appending
 * history is not a decision the admin makes — it happens either way, and a
 * dialog would imply it were optional.
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
  component: LibraryComponent;
  categories: Category[];
}) {
  const isAdmin = useIsAdmin();
  const readOnly = !isAdmin;

  const [active, setActive] = React.useState(component.active);
  const [environment, setEnvironment] = React.useState<EnvironmentType>(
    component.environment,
  );

  return (
    <div className="flex flex-col gap-6">
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
              defaultValue={component.name}
              disabled={readOnly}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="component-sku" className="text-sm font-semibold">
              SKU
            </label>
            <Input
              id="component-sku"
              defaultValue={component.sku}
              disabled={readOnly}
              className="font-mono"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Category</span>
            <Select defaultValue={component.category_id} disabled={readOnly}>
              <SelectTrigger className="w-full" aria-label="Category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="component-vendor" className="text-sm font-semibold">
              Vendor
            </label>
            <Input
              id="component-vendor"
              defaultValue={component.vendor ?? ""}
              disabled={readOnly}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="component-cost" className="text-sm font-semibold">
              Cost
            </label>
            <Input
              id="component-cost"
              variant="editable"
              inputMode="decimal"
              defaultValue={component.cost}
              disabled={readOnly}
            />
            <span className="text-xs text-muted-foreground">
              Changing this appends a price-history row in the same transaction.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="component-date" className="text-sm font-semibold">
              Quoted date
            </label>
            <Input
              id="component-date"
              variant="editable"
              type="date"
              defaultValue={component.quoted_date}
              disabled={readOnly}
            />
            <span className="text-xs text-muted-foreground">
              Freshness is measured from this date against the thresholds in
              settings.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="component-hours" className="text-sm font-semibold">
              Default labor hours
            </label>
            <Input
              id="component-hours"
              variant="editable"
              inputMode="decimal"
              defaultValue={component.default_labor_hours}
              disabled={readOnly}
            />
            <span className="text-xs text-muted-foreground">
              Pre-filled on a quote line; a rep can override it per quote.
            </span>
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
              A deactivated component stays on quotes that already use it,
              priced as-is and marked deactivated, and is not selectable for new
              lines on any quote.
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
          <Button>Save component</Button>
        </div>
      ) : null}
    </div>
  );
}
