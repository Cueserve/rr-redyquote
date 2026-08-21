import { ReadOnlyNotice } from "@/components/layout/admin-only";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  NumericSettingKey,
  SettingsDraft,
  SettingsFieldErrors,
} from "@/lib/validation/settings";

/** Shared so submit-time focus can find a field without threading refs. */
export function settingFieldId(key: NumericSettingKey) {
  return `setting-${key}`;
}

interface NumericFieldSpec {
  key: NumericSettingKey;
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
  error,
  readOnly,
  onChange,
}: {
  spec: NumericFieldSpec;
  value: string;
  error: string | undefined;
  readOnly: boolean;
  onChange: (key: NumericSettingKey, value: string) => void;
}) {
  const id = settingFieldId(spec.key);
  const helpId = `${id}-help`;
  const unitId = `${id}-unit`;
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {spec.label}
      </label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          // A real `name`, so the Server Action can read this off FormData
          // without the markup changing shape -- same reasoning as the login
          // form, which is already built for the action it does not have yet.
          name={spec.key}
          // `default` rather than `editable` when a rep is looking. The amber
          // variant means "an estimator can type into this" (input.tsx §7.6);
          // on a read-only field the tint promises an edit that is never
          // offered, which is the one thing the variant is not allowed to do.
          variant={readOnly ? "default" : "editable"}
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(spec.key, event.target.value)}
          // `readOnly`, never `disabled`. A disabled input leaves the tab order
          // and drops out of a screen reader's forms mode, which put all eight
          // numbers out of reach of exactly the reader this page is shown to:
          // a rep who needs to see the margin floor their quote is measured
          // against (see the docblock on page.tsx). Read-only withholds the
          // edit without withholding the value.
          readOnly={readOnly}
          // The destructive border and ring already hang off this attribute in
          // inputVariants; setting it is the whole of the error styling.
          aria-invalid={error ? true : undefined}
          // Unit first, because without it a screen reader announces "Margin
          // floor, 20" and never "percent". Error before help: what is wrong
          // now outranks what the field is for.
          aria-describedby={[unitId, error ? errorId : null, helpId]
            .filter(Boolean)
            .join(" ")}
          className="w-32 text-right"
        />
        <span id={unitId} className="text-sm text-muted-foreground">
          {spec.unit}
        </span>
      </div>
      {error ? (
        <span
          id={errorId}
          className="max-w-[57ch] text-xs font-semibold text-destructive"
        >
          {error}
        </span>
      ) : null}
      {/* 57ch, not 65ch -- see the measure note in layout/page-header.tsx. */}
      <span id={helpId} className="max-w-[57ch] text-xs text-muted-foreground">
        {spec.help}
      </span>
    </div>
  );
}

export function SettingsDefaultsTab({
  draft,
  errors,
  readOnly,
  isPending,
  onFieldChange,
  onSubmit,
}: {
  draft: SettingsDraft;
  errors: SettingsFieldErrors;
  readOnly: boolean;
  isPending?: boolean;
  onFieldChange: (key: NumericSettingKey, value: string) => void;
  onSubmit: () => void;
}) {
  const errorCount = Object.keys(errors).length;

  return (
    <div className="flex flex-col gap-6">
      {readOnly ? <ReadOnlyNotice what="Estimating Defaults" /> : null}

      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        noValidate
      >
        <Card className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-md font-semibold tracking-tight">
              Rates and Markups
            </h2>
            {/* Capped for the same reason as every other run of prose here;
                left unbounded this measured 168 characters per line at 1280. */}
            <p className="max-w-[57ch] text-sm text-muted-foreground">
              These are the inputs every quote is priced from. Changing one does
              not reprice quotes that are already saved - each quote snapshots
              its cost basis at save time.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {RATE_FIELDS.map((spec) => (
              <NumericField
                key={spec.key}
                spec={spec}
                value={draft[spec.key]}
                error={errors[spec.key]}
                readOnly={readOnly}
                onChange={onFieldChange}
              />
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-md font-semibold tracking-tight">
              Price Freshness
            </h2>
            <p className="max-w-[57ch] text-sm text-muted-foreground">
              Both badges and the stale-price count on the quotes dashboard are
              measured against these two thresholds.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FRESHNESS_FIELDS.map((spec) => (
              <NumericField
                key={spec.key}
                spec={spec}
                value={draft[spec.key]}
                error={errors[spec.key]}
                readOnly={readOnly}
                onChange={onFieldChange}
              />
            ))}
          </div>
        </Card>

        {/* Rendered unconditionally, and empty when the form is clean: a live
            region inserted at the same moment as its text is frequently missed
            entirely. Focus also moves to the first invalid field on submit, so
            this carries the count the focused field cannot -- how many others
            are wrong. */}
        <p aria-live="polite" className="sr-only">
          {errorCount > 0
            ? `${errorCount} ${errorCount === 1 ? "field needs" : "fields need"} attention before this can be saved.`
            : ""}
        </p>

        {readOnly ? null : (
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save settings"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Each changed field writes an audit row in the same transaction.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
