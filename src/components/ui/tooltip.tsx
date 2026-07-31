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
const TooltipTrigger = TooltipPrimitive.Trigger;

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
