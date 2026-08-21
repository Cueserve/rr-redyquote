import { z } from "zod";

export const quoteLineSchema = z
  .object({
    id: z.string().uuid().optional(),
    category_id: z.string().uuid().nullable().optional(),
    component_id: z.string().uuid().nullable().optional(),
    description: z.string().min(1, "Description is required"),
    is_misc: z.boolean().default(false),
    hard_cost: z.number().min(0, "Cost must be a positive number").default(0),
    labor_hours: z.number().min(0, "Labor hours must be positive").default(0),
    markup_percent: z.number().default(0),
    sort_order: z.number().int().default(0),
    environment_mismatch: z.boolean().default(false),
  })
  .refine((data) => data.is_misc || data.category_id, {
    message: "Category is required unless it's a misc item",
    path: ["category_id"],
  });

export const quoteSchema = z.object({
  id: z.string().uuid().optional(),
  customer_name: z.string().min(1, "Customer name is required"),
  product_id: z.string().uuid(),
  fab_tier_id: z.string().uuid(),
  environment: z.enum(["any", "indoor", "outdoor"]),
  lines: z.array(quoteLineSchema).default([]),
});

export type QuoteInput = z.infer<typeof quoteSchema>;
export type QuoteLineInput = z.infer<typeof quoteLineSchema>;
