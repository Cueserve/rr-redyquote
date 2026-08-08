import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The design system's DataTable (§7.11): stone-50 header row, --border-default
// row rules, stone-50 hover wash. Presentational shell only -- no
// data-fetching, no column-def abstraction; callers compose Table/Header/Row/
// Cell directly, same as shadcn's own table primitives.
const cellVariants = cva("px-3 py-2.5", {
  variants: {
    density: {
      comfortable: "px-3 py-2.5",
      compact: "px-2 py-2",
    },
  },
  defaultVariants: {
    density: "comfortable",
  },
});

// `caption` is required rather than optional: a screen reader lands on a table
// with no idea what it lists, and every table here is one of several on a
// route. Rendered `sr-only` because the visible heading already says it.
//
// The wrapper carries no padding on purpose -- it is the horizontal scroll
// container, and an inset would peel the `bg-muted` header away from the
// border. impeccable's `cramped-padding` flags it; that finding is wrong here.
function Table({
  className,
  caption,
  children,
  ...props
}: React.ComponentProps<"table"> & { caption: string }) {
  return (
    <div className="w-full overflow-x-auto rounded-md border border-border">
      <table
        data-slot="table"
        className={cn("w-full border-collapse text-sm", className)}
        {...props}
      >
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-muted", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={className} {...props} />;
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border transition-colors last:border-b-0 hover:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({
  className,
  density = "comfortable",
  scope = "col",
  ...props
}: React.ComponentProps<"th"> & VariantProps<typeof cellVariants>) {
  return (
    <th
      data-slot="table-head"
      scope={scope}
      className={cn(
        cellVariants({ density }),
        "text-left text-xs font-semibold text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({
  className,
  density = "comfortable",
  numeric = false,
  ...props
}: React.ComponentProps<"td"> &
  VariantProps<typeof cellVariants> & { numeric?: boolean }) {
  return (
    <td
      data-slot="table-cell"
      data-numeric={numeric}
      className={cn(
        cellVariants({ density }),
        "text-foreground",
        numeric && "font-mono tabular-nums",
        className,
      )}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
