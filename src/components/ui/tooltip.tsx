import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// The design system's Tooltip (§7.15): dark chip, single default style (no
// variants), same fade motion as Toast/Dialog. Uses `bg-foreground` rather
// than a literal stone step -- tier-1 primitives generate no utility classes
// (DESIGN-SYSTEM.md §2/§3) and `text-foreground`/`bg-foreground` already
// invert correctly in dark mode, giving the same "dark chip on either
// surface" effect without a raw palette class.
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;

/**
 * Radix renders the bare trigger as a real `<button type="button">`, and that
 * button is the only reason the tip is reachable without a mouse (WCAG 2.1.1,
 * Level A). Passing `asChild` with a non-focusable child -- an `svg`, a `span`,
 * a `Badge` -- silently swaps the button away and strands the content: the icon
 * still renders, but keyboard and screen-reader users never get its
 * explanation.
 *
 * So the default styling lives here rather than at each call site: a passive
 * hint just wraps its content in `<TooltipTrigger>` and inherits the focus
 * ring. Reach for `asChild` only when the child is already focusable (a Button,
 * a Link), which is why the default classes are withheld in that case -- they
 * would fight the child's own.
 */
function TooltipTrigger({
  className,
  asChild,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      asChild={asChild}
      className={
        asChild
          ? className
          : cn(
              "inline-flex cursor-default items-center gap-1.5 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring",
              className,
            )
      }
      {...props}
    />
  );
}

function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 rounded-sm bg-foreground px-2.5 py-1.5 text-xs whitespace-nowrap text-background shadow-sm data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0 duration-150",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent };
