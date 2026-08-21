import { z } from "zod";

export const componentSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  vendor: z.string().nullable().optional(),
  environment: z.enum(["any", "indoor", "outdoor"]).default("any"),
  cost: z.number().min(0, "Cost must be a positive number"),
  default_labor_hours: z
    .number()
    .min(0, "Labor hours must be positive")
    .default(0),
  active: z.boolean().default(true),
});

export type ComponentInput = z.infer<typeof componentSchema>;
