import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The design system's EmptyState (§7.16): plain, centered, --text-tertiary.
// No illustration -- DESIGN-SYSTEM.md §11 voice rule. Copy is passed as
// children, not baked in, so callers write the plain "Loading..."/"Nothing
// here yet" text themselves.
const emptyStateVariants = cva(
  "flex flex-col items-center gap-1 text-center text-muted-foreground",
  {
    variants: {
      size: {
        sm: "px-4 py-6 text-sm",
        default: "px-6 py-10 text-base",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

function EmptyState({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyStateVariants>) {
  return (
    <div
      data-slot="empty-state"
      data-size={size}
      className={cn(emptyStateVariants({ size, className }))}
      {...props}
    />
  );
}

export { EmptyState };
