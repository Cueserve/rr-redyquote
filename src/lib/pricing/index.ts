import type { Database } from "@/lib/supabase/types";

type DbQuoteLine = Database["public"]["Tables"]["quote_lines"]["Row"];
type DbSettings = Database["public"]["Tables"]["settings"]["Row"];
type DbFabTier = Database["public"]["Tables"]["fab_tiers"]["Row"];
type DbProduct = Database["public"]["Tables"]["products"]["Row"];

export interface PricingResult {
  total_hard_cost: number;
  total_labor_cost: number;
  cushion_amount: number;
  commission_amount: number;
  total_cost: number;
  final_price_each: number;
  gp_dollars: number;
  gp_percent: number;
  below_margin_floor: boolean;
}

/**
 * Calculates the quote totals based on the lines, settings, and product tiers.
 *
 * NOTE: PRD §7A notes that the Pricing Formula is an open decision.
 * This is a placeholder implementation that structurally matches the requirements
 * (taking the correct inputs and returning the 9 canonical columns for quotes)
 * but the actual math is subject to change when the fixtures are signed off.
 */
export function calculateQuote(
  lines: DbQuoteLine[],
  settings: DbSettings,
  fabTier: DbFabTier | null,
  product: DbProduct | null,
): PricingResult {
  // 1. Calculate base costs
  const lineHardCost = lines.reduce(
    (acc, line) => acc + (line.hard_cost || 0),
    0,
  );
  const fabHardCost = fabTier?.cost || 0;
  const totalHardCost = lineHardCost + fabHardCost;

  const laborRate = settings.labor_rate;

  const lineLaborHours = lines.reduce(
    (acc, line) => acc + (line.labor_hours || 0),
    0,
  );
  const productLaborHours = product?.est_labor_hours || 0;
  const totalLaborCost = (lineLaborHours + productLaborHours) * laborRate;

  const baseCost = totalHardCost + totalLaborCost;

  // 2. Add cushion and commission
  const cushionAmount = baseCost * (settings.cushion_percent / 100);
  const commissionAmount = baseCost * (settings.commission_percent / 100);

  const totalCost = baseCost + cushionAmount + commissionAmount;

  // 3. Markups (placeholder application)
  // We apply the component markup to the lines, and fab markup to the fab tier
  const lineSellPrice = lines.reduce((acc, line) => {
    return acc + line.hard_cost * (1 + line.markup_percent / 100);
  }, 0);

  const fabSellPrice = fabHardCost * (1 + settings.fab_markup_percent / 100);

  // Final price is the sum of marked up components + marked up fab + labor + cushion + commission
  // (Again, placeholder logic, PRD-007A applies)
  const finalPriceEach =
    lineSellPrice +
    fabSellPrice +
    totalLaborCost +
    cushionAmount +
    commissionAmount;

  // 4. Margins
  const gpDollars = finalPriceEach - totalCost;
  const gpPercent = finalPriceEach > 0 ? (gpDollars / finalPriceEach) * 100 : 0;

  const belowMarginFloor = gpPercent < settings.margin_floor_percent;

  return {
    total_hard_cost: totalHardCost,
    total_labor_cost: totalLaborCost,
    cushion_amount: cushionAmount,
    commission_amount: commissionAmount,
    total_cost: totalCost,
    final_price_each: finalPriceEach,
    gp_dollars: gpDollars,
    gp_percent: gpPercent,
    below_margin_floor: belowMarginFloor,
  };
}
