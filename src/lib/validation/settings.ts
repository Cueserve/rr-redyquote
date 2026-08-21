import { z } from "zod";

/**
 * Estimating-defaults validation (PRD-012).
 *
 * Every rule below mirrors a named CHECK constraint on the `settings` table
 * (`supabase/migrations/0003_settings.sql`, as amended by `0004`). The database
 * is the enforcement boundary; this schema exists so an admin is told which
 * field is wrong before a round trip, and so the Server Action and the form
 * cannot disagree about what "valid" means (ARCHITECTURE §5 — Zod is the single
 * validation tool of record, and Server Actions validate with a schema from
 * this folder).
 *
 * Deliberately NO upper bounds. 0003 says why, and it applies just as much
 * here: "PRD §7A has not fixed the sane ranges, and a wrong ceiling is worse
 * than none." A markup of 400% is unusual, not invalid, and this file is not
 * the place to decide that. Precision and scale (`numeric(5,2)`, `smallint`)
 * are likewise left to Postgres to reject — mirroring them here would be
 * inventing a limit rather than reflecting a rule.
 */

/**
 * The numeric columns of the `settings` row, in the order they are edited on
 * screen. Submit-time focus moves to the first invalid field in this order, so
 * it has to match the visual order of the two field groups.
 */
export const NUMERIC_SETTING_KEYS = [
  "labor_rate",
  "fab_markup_percent",
  "component_markup_percent",
  "cushion_percent",
  "commission_percent",
  "margin_floor_percent",
  "freshness_warning_months",
  "freshness_requote_months",
] as const;

export type NumericSettingKey = (typeof NUMERIC_SETTING_KEYS)[number];

/**
 * The in-progress edit, held as strings rather than numbers.
 *
 * Parsing on every keystroke destroys a half-typed decimal: "2." parses to 2,
 * re-renders as "2", and the point can never be typed at all — which would
 * make the 2.5 cushion and the 1.25 commission unreachable. The string is the
 * edit buffer; this schema is what turns it into numbers, once, at submit.
 */
export type SettingsDraft = Record<NumericSettingKey, string>;

/** A blank field and a field holding "abc" are different mistakes. */
function numericString(label: string) {
  return z
    .string()
    .trim()
    .refine((value) => value.length > 0, { error: `${label} is required.` })
    .refine((value) => value.length === 0 || Number.isFinite(Number(value)), {
      error: `${label} must be a number.`,
    })
    .transform(Number);
}

/** Mirrors the `*_nonneg` constraints. */
function nonNegative(label: string) {
  return numericString(label).refine((value) => value >= 0, {
    error: `${label} cannot be negative.`,
  });
}

/** `freshness_*_months` are `smallint`; a fractional month cannot be stored. */
function wholeMonths(label: string) {
  return numericString(label).refine(Number.isInteger, {
    error: `${label} must be a whole number of months.`,
  });
}

// `satisfies` is the drift guard: add a column to NUMERIC_SETTING_KEYS without
// a rule here, or a rule without a key, and this stops compiling.
const settingsFields = {
  labor_rate: nonNegative("Labor rate"),
  fab_markup_percent: nonNegative("Fabrication markup"),
  component_markup_percent: nonNegative("Component markup"),
  cushion_percent: nonNegative("Cushion"),
  commission_percent: nonNegative("Sales commission"),
  margin_floor_percent: nonNegative("Margin floor"),
  // `settings_freshness_warning_positive`.
  freshness_warning_months: wholeMonths("Aging after").refine(
    (value) => value >= 1,
    { error: "Aging after must be at least 1 month." },
  ),
  freshness_requote_months: wholeMonths("Re-quote after"),
} satisfies Record<NumericSettingKey, z.ZodType<number, string>>;

export const settingsDraftSchema = z
  .object(settingsFields)
  .refine(
    (value) => value.freshness_requote_months > value.freshness_warning_months,
    {
      // `settings_freshness_order`. The field help has always stated this rule;
      // until now nothing enforced it on the way in.
      error: "Re-quote after must be greater than the aging threshold.",
      path: ["freshness_requote_months"],
    },
  );

/** The parsed row, ready for the Server Action. */
export type SettingsValues = z.infer<typeof settingsDraftSchema>;

export type SettingsFieldErrors = Partial<
  Record<NumericSettingKey | "root", string>
>;

export type SettingsValidation =
  | { ok: true; values: SettingsValues; errors: SettingsFieldErrors }
  | { ok: false; values: null; errors: SettingsFieldErrors };

export function validateSettingsDraft(
  draft: SettingsDraft,
): SettingsValidation {
  const result = settingsDraftSchema.safeParse(draft);
  if (result.success) {
    return { ok: true, values: result.data, errors: {} };
  }

  // First issue per field wins, so "is required" is shown instead of the
  // "must be a number" that an empty string also trips.
  const errors: SettingsFieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in errors)) {
      errors[key as NumericSettingKey] = issue.message;
    }
  }

  return { ok: false, values: null, errors };
}
