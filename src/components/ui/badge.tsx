import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

// The design system's StatusPill (§7.3): pill radius, 12px semibold, and a
// three-part color set -- tinted background, saturated ink, 1px border. Every
// variant reads from semantic tokens, so the whole set re-themes from
// globals.css and flips correctly in dark mode.
//
// Pill borders are decorative: the tint plus the ink already carry the meaning,
// and both clear AA against each other. So these borders have no 3:1 floor and
// use the exported values as-is.
//
// This component stays app-agnostic on purpose -- it knows about success /
// warning / info, not about "Review" or "Sent". The quote-lifecycle
// mapping belongs in src/components/ once the quote routes exist, per
// PROJECT-STRUCTURE.md §2.
const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3",
  {
    variants: {
      variant: {
        default: "border-primary-border bg-primary-muted text-primary-text",
        secondary: "border-border bg-muted text-muted-foreground",
        outline: "border-border text-muted-foreground",
        success: "border-success-border bg-success-muted text-success",
        warning: "border-warning-border bg-warning-muted text-warning",
        info: "border-info-border bg-info-muted text-info",
        destructive:
          "border-destructive-border bg-destructive-muted text-destructive",
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
    /** Leading status dot, in the variant's own ink color. */
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
