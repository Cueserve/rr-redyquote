import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

// Sizes, radius and weight follow the Proposal System design system §7.1.
// Two deliberate departures from it, both recorded in docs/DESIGN-SYSTEM.md:
//
//  1. `destructive` is a TINT, never a solid fill, AND a different hue family
//     than primary -- not just a darker/desaturated red. The export reuses
//     brand red for danger (filled vs. outlined); --destructive is instead a
//     burnt-orange/rust hue (~38deg vs. clay's ~26deg) so a "Save Quote" and a
//     "Delete line" button read as different controls, not the same one at
//     different opacity. See DESIGN-SYSTEM.md §6.
//  2. Press darkens a step (--primary-active) instead of translating. The
//     design system forbids scale/shrink transforms outright: motion must never
//     make a number feel imprecise.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent bg-clip-padding font-semibold whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-70 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Exactly one of these per screen -- the design system reserves the
        // clay fill for the single primary action.
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active",
        // Secondary actions are moss, not a lighter clay.
        secondary:
          "bg-accent-secondary text-accent-secondary-foreground hover:bg-accent-secondary-hover",
        // The export's "ghost": transparent with a real boundary. Uses --input
        // rather than --border because a button outline identifies a control
        // and therefore carries the 3:1 floor.
        outline:
          "border-input text-foreground hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent",
        ghost:
          "text-foreground hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent",
        destructive:
          "bg-destructive-muted text-destructive hover:border-destructive-border focus-visible:ring-destructive",
        link: "text-primary-text underline-offset-4 hover:underline",
      },
      size: {
        sm: "px-3 py-1.5 text-sm",
        default: "px-4.5 py-2.5 text-base",
        lg: "px-5.5 py-3.5 text-md",
        // 36px square matches the design system's IconButton.
        icon: "size-9",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-11 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
