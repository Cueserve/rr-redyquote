import * as React from "react";

import { cn } from "@/lib/utils";

// Page-level chrome, sitting between the Topbar's breadcrumbs and the content:
// a title, one calm sentence of context, a page-level notice, and the page's
// action slot. Kept out of `ui/` for the same reason as Sidebar and Topbar — it
// is app chrome rather than a shared atom.
//
// The action slot is where a page's single filled-primary button goes
// (DESIGN-SYSTEM.md §6: one clay action per screen, everything else outline or
// ghost). It is `shrink-0`, so it must only ever hold controls — prose put
// there cannot yield, and at 768px (the narrowest supported width, PRD NFR-008)
// a sentence-length action slot overflowed *backwards* over the h1 and clipped
// at the viewport edge. That is what `notice` exists to prevent: page-level
// status copy gets its own full-width row, below the title block and outside
// the shrink-0 row entirely.
function PageHeader({
  title,
  description,
  notice,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Page-level status copy — a permission notice, a stale-data warning. Never
   *  a control; those go in `actions`. */
  notice?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="page-header"
      className={cn("flex flex-col gap-3", className)}
    >
      <div className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-xl leading-tight">{title}</h1>
          {/* Capped at 70ch, not on PageBody: the measure limit is a property of
              prose, and the table below wants every pixel it can get. Left
              unbounded it ran 91ch at 1280. */}
          {description ? (
            <p className="max-w-[70ch] text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {/* `text-xs` here is what makes the cap correct, not just a style: `ch`
          resolves against the element's OWN font-size, so a bare
          `max-w-[65ch]` on this div would compute against the inherited 15px
          body size (~585px) rather than the 12px the notice actually renders
          at -- measured at 93 chars per line, still over the ~85 ceiling.
          Declaring the size here resolves `ch` at 12px: ~468px, ~78 chars.
          This div owns the notice row's type size; children may override it,
          but then they own their own measure too. */}
      {notice ? <div className="max-w-[65ch] text-xs">{notice}</div> : null}
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
