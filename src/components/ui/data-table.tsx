import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

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
//
// It IS a tab stop, though (WCAG 2.1.1). An `overflow-x: auto` container that
// clips content is unreachable by keyboard unless it is focusable itself: only
// the row-name cell holds a link, every column after it is inert, so tabbing
// through a table scrolls it vertically and never horizontally. Measured on
// /library at 768px -- PRD NFR-008's narrowest supported width -- the table
// wants 710px and gets 646px, so the Freshness badge is what falls off the
// right edge, unreachable without a mouse. `role="region"` named by the caption
// is what keeps the new stop from announcing itself as an anonymous group.
//
// `scrollbar-color` is set for the same reason: platforms with overlay
// scrollbars (macOS) draw nothing until a scroll is already in progress, so the
// only cue that content continues is a clipped cell against a 1.42:1 decorative
// border. Naming a thumb color opts out of the overlay style. --input is the
// right token rather than --border: this is a control boundary, not a rule, and
// it carries the 3:1 that --border deliberately does not (globals.css §Lines).
// A fade or scroll shadow -- the conventional fix -- is not available here:
// DESIGN-SYSTEM.md §9 "Surfaces" is flat color only, no gradients.
function Table({
  className,
  caption,
  children,
  ...props
}: React.ComponentProps<"table"> & { caption: string }) {
  return (
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className="w-full overflow-x-auto rounded-md border border-border outline-none [scrollbar-color:var(--input)_transparent] [scrollbar-width:thin] focus-visible:ring-3 focus-visible:ring-ring"
    >
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

// Sort affordance, added for the list screens (design spec §5.2). Additive and
// opt-in: a TableHead with no `sortKey` renders exactly the `<th>` it always
// did, which is what every non-sortable column still wants -- `Fab pricing` and
// `Environment` are badge summaries with no natural order, and a column whose
// sort produces an arbitrary sequence is worse than one that plainly cannot be
// sorted.
//
// This is a prop on an existing primitive, matching the `editable` variant
// precedent in input.tsx. It is deliberately NOT a column-def abstraction: the
// charter at the top of this file rules that out, and the three tables have
// genuinely divergent cells.
//
// `aria-sort` goes on the `<th>` and the control is a real `<button>` inside
// it. A `<th>` with a click handler is not focusable and not announced as
// actionable; the button is both, for free.
type SortState = "asc" | "desc" | null;

const SORT_ICON = {
  asc: ArrowUp,
  desc: ArrowDown,
} as const;

function TableHead({
  className,
  density = "comfortable",
  scope = "col",
  sortKey,
  sortState = null,
  onSort,
  children,
  ...props
}: React.ComponentProps<"th"> &
  VariantProps<typeof cellVariants> & {
    sortKey?: string;
    sortState?: SortState;
    onSort?: (key: string) => void;
  }) {
  const classes = cn(
    cellVariants({ density }),
    "text-left text-xs font-semibold text-muted-foreground",
    className,
  );

  if (!sortKey || !onSort) {
    return (
      <th data-slot="table-head" scope={scope} className={classes} {...props}>
        {children}
      </th>
    );
  }

  // The inactive icon stays visible rather than appearing on hover: an
  // affordance nobody can see is not an affordance, and hover reveals nothing
  // to a keyboard or touch user.
  const Icon = sortState ? SORT_ICON[sortState] : ArrowUpDown;

  return (
    <th
      data-slot="table-head"
      scope={scope}
      aria-sort={
        sortState === "asc"
          ? "ascending"
          : sortState === "desc"
            ? "descending"
            : undefined
      }
      className={classes}
      {...props}
    >
      {/* No `aria-label`: the visible column name IS the accessible name
          (WCAG 2.5.3), and the state is carried by `aria-sort` on the `<th>`
          rather than duplicated into the label. */}
      <button
        type="button"
        data-slot="table-sort"
        onClick={() => onSort(sortKey)}
        className="-mx-1 inline-flex items-center gap-1.5 rounded-sm px-1 py-0.5 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
      >
        {children}
        <Icon
          aria-hidden="true"
          className={cn("size-3.5 shrink-0", !sortState && "opacity-50")}
        />
      </button>
    </th>
  );
}

// `header` renders the cell as `<th scope="row">` instead of `<td>`. Exactly one
// cell per row should carry it: the one naming the thing the row is about. A
// screen reader walking cell by cell otherwise hears the column name and the
// value with nothing saying *which* row it is on -- "SKU, RR-WF55-FS" and never
// "Wayfinder 55 freestanding". It is styled as a body cell, not as a
// TableHead: `th` defaults to bold and centered in the UA sheet, and the row
// name is ordinary content, not a column label.
function TableCell({
  className,
  density = "comfortable",
  numeric = false,
  header = false,
  ...props
}: React.ComponentProps<"td"> &
  VariantProps<typeof cellVariants> & {
    numeric?: boolean;
    header?: boolean;
  }) {
  const classes = cn(
    cellVariants({ density }),
    "text-foreground",
    numeric && "font-mono tabular-nums",
    className,
  );

  if (header) {
    return (
      <th
        data-slot="table-cell"
        data-numeric={numeric}
        scope="row"
        className={cn("text-left font-normal", classes)}
        {...props}
      />
    );
  }

  return (
    <td
      data-slot="table-cell"
      data-numeric={numeric}
      className={classes}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
