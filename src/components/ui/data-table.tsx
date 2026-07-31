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

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto rounded-md border border-border">
      <table
        data-slot="table"
        className={cn("w-full border-collapse text-sm", className)}
        {...props}
      />
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
  ...props
}: React.ComponentProps<"th"> & VariantProps<typeof cellVariants>) {
  return (
    <th
      data-slot="table-head"
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
