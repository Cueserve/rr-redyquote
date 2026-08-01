import * as React from "react";

import { cn } from "@/lib/utils";

// Page-level chrome, sitting between the Topbar's breadcrumbs and the content:
// a title, one calm sentence of context, and the page's action slot. Kept out
// of `ui/` for the same reason as Sidebar and Topbar — it is app chrome rather
// than a shared atom.
//
// The action slot is where a page's single filled-primary button goes
// (DESIGN-SYSTEM.md §6: one clay action per screen, everything else outline or
// ghost).
function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="page-header"
      className={cn("flex items-start justify-between gap-6", className)}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-xl leading-tight">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

/** The standard content well: max width, page padding, 24–32px section rhythm
 *  (DESIGN-SYSTEM.md §9 density rule). */
function PageBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-body"
      className={cn(
        "mx-auto flex w-full max-w-(--container-max) flex-col gap-7 px-7 py-7",
        className,
      )}
      {...props}
    />
  );
}

export { PageHeader, PageBody };
