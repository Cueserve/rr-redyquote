import * as React from "react";

import { cn } from "@/lib/utils";

// The design system's Topbar (§7.18): breadcrumb-style crumbs, right-aligned
// action slot, --border-default bottom rule. Not `ui/` for the same reason as
// Sidebar -- see the comment there.
function Topbar({
  crumbs,
  right,
  className,
}: {
  crumbs: string[];
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="topbar"
      className={cn(
        "flex items-center justify-between border-b border-border bg-card px-7 py-4",
        className,
      )}
    >
      <div className="flex items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <React.Fragment key={crumb}>
              {index > 0 ? (
                <span className="text-muted-foreground">/</span>
              ) : null}
              <span
                className={cn(
                  isLast
                    ? "font-semibold text-foreground"
                    : "font-normal text-muted-foreground",
                )}
              >
                {crumb}
              </span>
            </React.Fragment>
          );
        })}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

export { Topbar };
