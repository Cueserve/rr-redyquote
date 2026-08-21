"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  componentSchema,
  type ComponentInput,
} from "@/lib/validation/component";
import { parseDbError } from "@/lib/supabase/error";

export type SaveComponentResult =
  | { ok: true; id: string }
  | {
      ok: false;
      errors: Partial<Record<keyof ComponentInput | "root", string>>;
    };

export async function saveComponent(
  input: ComponentInput,
): Promise<SaveComponentResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, errors: { root: "Unauthorized - please log in." } };
  }

  const parsed = componentSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0] as string;
      errors[path] = issue.message;
    }
    return { ok: false, errors };
  }

  const values = parsed.data;

  const dbPayload = {
    ...(values.id ? { id: values.id } : {}),
    category_id: values.category_id,
    name: values.name,
    sku: values.sku,
    vendor: values.vendor || null,
    environment: values.environment,
    cost: values.cost,
    default_labor_hours: values.default_labor_hours,
    quoted_date: values.quoted_date,
    active: values.active,
  };

  const { data, error } = await supabase
    .from("components")
    .upsert(dbPayload)
    .select("id")
    .single();

  if (error) {
    if (error.code === "42501") {
      return {
        ok: false,
        errors: { root: "You must be an admin to edit components." },
      };
    }
    if (error.code === "23505") {
      // unique violation
      return {
        ok: false,
        errors: { sku: "A component with this SKU already exists." },
      };
    }
    return { ok: false, errors: { root: parseDbError(error) } };
  }

  revalidatePath("/library", "layout");
  return { ok: true, id: data.id };
}
