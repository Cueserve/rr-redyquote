import { z } from "zod";

export const fabTierSchema = z.object({
  id: z.string().uuid().optional(),
  qty_tier: z.number().int().min(1, "Quantity tier must be at least 1"),
  cost: z.number().min(0, "Cost must be a positive number"),
  quoted_date: z.string(),
  vendor: z.string().nullable().optional(),
});

export const productDefaultSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid(),
  component_id: z.string().uuid().nullable().optional(),
});

export const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string().nullable().optional(),
  vendor: z.string().nullable().optional(),
  est_labor_hours: z
    .number()
    .min(0, "Estimated labor hours must be positive")
    .default(0),
  active: z.boolean().default(true),
});

export const createProductSchema = productSchema.extend({
  fab_tiers: z.array(fabTierSchema).optional(),
  product_defaults: z.array(productDefaultSchema).optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
export type FabTierInput = z.infer<typeof fabTierSchema>;
export type ProductDefaultInput = z.infer<typeof productDefaultSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
