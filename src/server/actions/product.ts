"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createProductSchema,
  type CreateProductInput,
} from "@/lib/validation/product";
import { parseDbError } from "@/lib/supabase/error";

export async function saveProduct(input: CreateProductInput) {
  const supabase = await createClient();

  const parseResult = createProductSchema.safeParse(input);

  if (!parseResult.success) {
    return {
      success: false,
      errors: parseResult.error.flatten().fieldErrors,
      message: "Invalid product data",
    };
  }

  const validData = parseResult.data;

  // Transform arrays into the JSON format expected by fn_save_product
  const tiersJson =
    validData.fab_tiers?.map((t) => ({
      qty_tier: t.qty_tier,
      cost: t.cost,
      quoted_date: t.quoted_date,
      vendor: t.vendor || null,
    })) || [];

  const defaultsJson =
    validData.product_defaults
      ?.filter((d) => d.component_id !== null)
      .map((d) => ({
        category_id: d.category_id,
        component_id: d.component_id,
      })) || [];

  const payload = {
    p_product_id: validData.id || "",
    p_name: validData.name,
    p_sku: validData.sku,
    p_description: validData.description || "",
    p_vendor: validData.vendor || "",
    p_est_labor_hours: validData.est_labor_hours,
    p_active: validData.active,
    p_fab_tiers: tiersJson,
    p_defaults: defaultsJson,
  };

  const { error } = await supabase.rpc("fn_save_product", payload);

  if (error) {
    console.error("Failed to save product:", error);
    // Return friendly error if constraint violation occurs
    if (error.message.includes("Cannot remove a quantity tier")) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: parseDbError(error),
    };
  }

  revalidatePath("/products");
  revalidatePath("/");

  return { success: true };
}
