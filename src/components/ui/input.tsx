import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The design system's Input (§7.6) formalizes the editable-vs-calculated
// convention (DESIGN-SYSTEM.md §7): `editable` is the amber-tinted, mono-value
// field an estimator can type into; `default` is a plain read-only-looking
// field. The border is what carries the meaning, not the tint -- see the
// contrast note in DESIGN-SYSTEM.md §4/§7.
const inputVariants = cva(
  "flex h-10 w-full min-w-0 rounded-sm border px-3 py-2.5 text-base outline-none transition-colors selection:bg-primary selection:text-primary-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-70 focus-visible:ring-3 focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/30",
  {
    variants: {
      variant: {
        default: "border-input bg-card text-foreground",
        editable:
          "border-editable-border bg-editable font-mono text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Input({
  className,
  variant = "default",
  type,
  ...props
}: React.ComponentProps<"input"> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      data-variant={variant}
      className={cn(inputVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Input, inputVariants };
