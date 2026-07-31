import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The design system's KpiStat (§7.12): label in --text-tertiary, value in
// --font-mono at --text-2xl, colored by tone. Tone affects only the value
// color -- the tile surface stays a neutral card.
const kpiValueVariants = cva("font-mono text-2xl leading-tight font-semibold", {
  variants: {
    tone: {
      neutral: "text-foreground",
      success: "text-success",
      warning: "text-warning",
      destructive: "text-destructive",
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

function KpiStat({
  className,
  label,
  value,
  tone = "neutral",
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof kpiValueVariants> & {
    label: React.ReactNode;
    value: React.ReactNode;
  }) {
  return (
    <div
      data-slot="kpi-stat"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span data-tone={tone} className={cn(kpiValueVariants({ tone }))}>
        {value}
      </span>
    </div>
  );
}

export { KpiStat };
