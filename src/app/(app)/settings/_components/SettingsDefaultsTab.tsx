import { ReadOnlyNotice } from "@/components/prototype/admin-only";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Settings } from "@/lib/mock";

interface NumericFieldSpec {
  key: keyof Settings;
  label: string;
  help: string;
  unit: "%" | "$" | "months";
}

const RATE_FIELDS: NumericFieldSpec[] = [
  {
    key: "labor_rate",
    label: "Labor rate",
    help: "Applied to every labor hour on a quote, per hour.",
    unit: "$",
  },
  {
    key: "fab_markup_percent",
    label: "Fabrication markup",
    help: "Added to the fab tier cost. 50 means 50% over cost.",
    unit: "%",
  },
  {
    key: "component_markup_percent",
    label: "Component markup",
    help: "Pre-filled on every new quote line. 20 means 20% over cost.",
    unit: "%",
  },
  {
    key: "cushion_percent",
    label: "Cushion",
    help: "Contingency added to the cost basis.",
    unit: "%",
  },
  {
    key: "commission_percent",
    label: "Sales commission",
    help: "Rep commission carried in the cost basis.",
    unit: "%",
  },
  {
    key: "margin_floor_percent",
    label: "Margin floor",
    help: "A quote below this is flagged. Advisory only - it never blocks a save or a submit.",
    unit: "%",
  },
];

const FRESHNESS_FIELDS: NumericFieldSpec[] = [
  {
    key: "freshness_warning_months",
    label: "Aging after",
    help: "A cost older than this shows an Aging badge.",
    unit: "months",
  },
  {
    key: "freshness_requote_months",
    label: "Re-quote after",
    help: "A cost older than this shows a Re-quote badge. Must be greater than the aging threshold.",
    unit: "months",
  },
];

function NumericField({
  spec,
  value,
  disabled,
}: {
  spec: NumericFieldSpec;
  value: number;
  disabled: boolean;
}) {
  const id = `setting-${String(spec.key)}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {spec.label}
      </label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          variant="editable"
          inputMode="decimal"
          defaultValue={value}
          disabled={disabled}
          className="w-32 text-right"
        />
        <span className="text-sm text-muted-foreground">{spec.unit}</span>
      </div>
      <span className="max-w-prose text-xs text-muted-foreground">
        {spec.help}
      </span>
    </div>
  );
}

export function SettingsDefaultsTab({
  settings,
  readOnly,
  isAdmin,
}: {
  settings: Settings;
  readOnly: boolean;
  isAdmin: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      {readOnly ? <ReadOnlyNotice what="Estimating Defaults" /> : null}

      <Card className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-md font-semibold tracking-tight">
            Rates and Markups
          </h2>
          <p className="text-sm text-muted-foreground">
            These are the inputs every quote is priced from. Changing one does
            not reprice quotes that are already saved - each quote snapshots its
            cost basis at save time.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {RATE_FIELDS.map((spec) => (
            <NumericField
              key={String(spec.key)}
              spec={spec}
              value={settings[spec.key] as number}
              disabled={readOnly}
            />
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-md font-semibold tracking-tight">
            Price Freshness
          </h2>
          <p className="text-sm text-muted-foreground">
            Both badges and the stale-price count on the quotes dashboard are
            measured against these two thresholds.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FRESHNESS_FIELDS.map((spec) => (
            <NumericField
              key={String(spec.key)}
              spec={spec}
              value={settings[spec.key] as number}
              disabled={readOnly}
            />
          ))}
        </div>
      </Card>

      {isAdmin ? (
        <div className="flex items-center gap-3">
          <Button>Save settings</Button>
          <p className="text-xs text-muted-foreground">
            Each changed field writes an audit row in the same transaction.
          </p>
        </div>
      ) : null}
    </div>
  );
}
