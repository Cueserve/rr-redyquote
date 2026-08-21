"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { quoteSchema, type QuoteInput } from "@/lib/validation/quote";
import { calculateQuote } from "@/lib/pricing";

export async function saveQuote(data: QuoteInput) {
  const supabase = await createClient();

  const userRes = await supabase.auth.getUser();
  if (!userRes.data.user) {
    return { success: false, error: "Not logged in" };
  }
  const userId = userRes.data.user.id;

  const parsed = quoteSchema.safeParse(data);
  if (!parsed.success) {
    console.error(
      "Quote validation failed:",
      JSON.stringify(parsed.error.issues, null, 2),
    );
    return {
      success: false,
      error: "Validation failed",
      issues: parsed.error.issues,
    };
  }

  const { id, customer_name, product_id, fab_tier_id, environment, lines } =
    parsed.data;

  // Fetch needed data for pricing
  const [settingsRes, fabTierRes, productRes] = await Promise.all([
    supabase.from("settings").select("*").single(),
    supabase.from("fab_tiers").select("*").eq("id", fab_tier_id).single(),
    supabase.from("products").select("*").eq("id", product_id).single(),
  ]);

  if (settingsRes.error)
    return { success: false, error: "Failed to fetch settings" };
  if (fabTierRes.error)
    return { success: false, error: "Failed to fetch fab tier" };
  if (productRes.error)
    return { success: false, error: "Failed to fetch product" };

  const settings = settingsRes.data;
  const fabTier = fabTierRes.data;
  const product = productRes.data;

  // Need to structure lines as DbQuoteLine for calculateQuote
  const dbLines = lines.map((line) => ({
    id: line.id ?? crypto.randomUUID(), // Ensure UUID if empty
    quote_id: id ?? "temp",
    category_id: line.category_id ?? null,
    component_id: line.component_id ?? null,
    description: line.description,
    is_misc: line.is_misc,
    hard_cost: line.hard_cost,
    labor_hours: line.labor_hours,
    labor_cost: 0, // calculateQuote does not mutate this, but DB requires it
    markup_percent: line.markup_percent,
    environment_mismatch: line.environment_mismatch,
    sort_order: line.sort_order,
    // Provide remaining fields required by the type, even if not used in calculation
    component_deactivated: false,
    freshness: "current",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const pricing = calculateQuote(
    dbLines as Parameters<typeof calculateQuote>[0],
    settings,
    fabTier,
    product,
  );

  // fn_save_quote takes fab_cost_snapshot inside p_pricing
  const pricingArg = {
    ...pricing,
    fab_cost_snapshot: fabTier.cost,
  };

  const rpcArgs = {
    p_quote_id: id ?? null,
    p_customer_name: customer_name,
    p_product_id: product_id,
    p_fab_tier_id: fab_tier_id,
    p_environment: environment,
    p_owner_id: userId,
    p_pricing: pricingArg,
    p_lines: dbLines,
  };

  const { data: savedQuote, error } = await supabase.rpc(
    "fn_save_quote",
    rpcArgs,
  );

  if (error) {
    console.error("Save quote error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/quotes");
  if (id) {
    revalidatePath(`/quotes/${id}`);
  }

  return { success: true, data: savedQuote };
}

export async function requestChanges(quoteId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_transition_quote_status", {
    p_quote_id: quoteId,
    p_to_status: "draft",
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  return { success: true, data };
}

export async function submitForReview(quoteId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_transition_quote_status", {
    p_quote_id: quoteId,
    p_to_status: "pending_approval",
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  return { success: true, data };
}

export async function approveQuote(quoteId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_transition_quote_status", {
    p_quote_id: quoteId,
    p_to_status: "approved",
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  return { success: true, data };
}

export async function markQuoteSent(quoteId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_transition_quote_status", {
    p_quote_id: quoteId,
    p_to_status: "sent",
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  return { success: true, data };
}
