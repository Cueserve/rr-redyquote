"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  SettingsValues,
  SettingsValidation,
} from "@/lib/validation/settings";

export async function saveSettings(
  values: SettingsValues,
): Promise<SettingsValidation> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      values: null,
      errors: { labor_rate: "Unauthorized - please log in." },
    };
  }

  // The DB columns are `_multiplier` for markups, but the UI edits them as `_percent`
  const dbPayload = {
    labor_rate: values.labor_rate,
    fab_markup_percent: values.fab_markup_percent,
    component_markup_percent: values.component_markup_percent,
    cushion_percent: values.cushion_percent,
    commission_percent: values.commission_percent,
    margin_floor_percent: values.margin_floor_percent,
    freshness_warning_months: values.freshness_warning_months,
    freshness_requote_months: values.freshness_requote_months,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("settings")
    .update(dbPayload)
    .eq("id", true);

  if (error) {
    if (error.code === "42501") {
      return {
        ok: false,
        values: null,
        errors: { labor_rate: "You must be an admin to update settings." },
      };
    }
    return { ok: false, values: null, errors: { labor_rate: error.message } };
  }

  // Revalidate everything because settings dictate global pricing calculation
  revalidatePath("/", "layout");
  return { ok: true, values, errors: {} };
}
