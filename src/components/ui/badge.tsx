import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

// Tinted fill + saturated text, matching the proposal-system prototype's badge
// treatment. Every variant reads its color from a semantic token, so the whole
// set re-themes from globals.css and flips correctly in dark mode.
//
// This component stays app-agnostic on purpose -- it knows about success /
// warning / info, not about "Pending Approval" or "Sent". The quote-lifecycle
// mapping belongs in src/components/ once the quote routes exist, per
// PROJECT-STRUCTURE.md §2.
const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap transition-colors [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary-text",
        // The neutral state carries a border: a tinted neutral cannot hold 4.5:1
        // against the grey page canvas at any usable tint level, and an untinted
        // one disappears into it. The border defines the shape on any surface.
        secondary: "border border-border bg-muted text-foreground",
        outline: "border border-border text-muted-foreground",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
        info: "bg-info/10 text-info",
        destructive: "bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  dot = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
    /** Leading status dot, in the variant's own color. */
    dot?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    >
      {dot ? (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      ) : null}
      {children}
    </Comp>
  );
}

export { Badge, badgeVariants };
