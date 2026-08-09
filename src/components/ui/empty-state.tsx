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

/**
 * The em-dash placeholder for a cell with no value.
 *
 * A bare "—" is silence: most screen readers announce nothing for it, so an
 * intentionally-empty cell is indistinguishable from a broken one. The dash is
 * therefore `aria-hidden` decoration and `label` is what actually gets read.
 * Shared rather than inlined because the dash appears in five tables, and an
 * inconsistent label is worse than no label -- impeccable's `em-dash-overuse`
 * counted 40 of them on the quote builder alone.
 *
 * This is NOT for a value that is merely pending calculation -- see
 * `PendingValue` in quote-builder/line-items.tsx, which says so in a tooltip.
 */
function EmptyValue({ label = "No value" }: { label?: string }) {
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="sr-only">{label}</span>
    </>
  );
}

export { EmptyState, EmptyValue };
