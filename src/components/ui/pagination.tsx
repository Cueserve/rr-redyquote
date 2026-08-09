import * as React from "react";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Pager for the three list screens (design spec §5.1). Presentational only: it
 * never reads the URL. `data-table.tsx` is presentational by charter and `ui/`
 * stays app-agnostic, so the routing lives in the app layer.
 *
 * First / Prev / Next / Last with no page-number list. At 2000 quotes and size
 * 25 that is 80 pages: Prev/Next alone means 79 clicks to reach the end, and a
 * numbered list needs ellipsis-truncation logic that is pure bug surface at
 * this scale. Four buttons plus "Page 3 of 7" covers it.
 *
 * The count sentence is NOT here, and neither is a `total` prop. Each screen
 * already carries a `role="status"` line naming its own noun ("...of 312
 * components"), and that line is the announcement channel for a sort click or a
 * page turn -- a second live region would just talk over it.
 */

const PAGE_SIZES = [25, 50, 100, "all"] as const;

const SIZE_LABEL: Record<string, string> = {
  "25": "25",
  "50": "50",
  "100": "100",
  all: "All",
};

export function Pagination({
  page,
  pageCount,
  size,
  onPageChange,
  onSizeChange,
  className,
}: {
  page: number;
  pageCount: number;
  size: number | "all";
  onPageChange: (page: number) => void;
  onSizeChange: (size: number | "all") => void;
  className?: string;
}) {
  const atStart = page <= 1;
  const atEnd = page >= pageCount;

  return (
    // `flex-wrap` and not a grid: at 768px, NFR-008's narrowest supported
    // width, the size selector drops below the pager rather than squeezing it.
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-2",
        className,
      )}
    >
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Rows per page
        <Select
          value={String(size)}
          onValueChange={(next) =>
            onSizeChange(next === "all" ? "all" : Number(next))
          }
        >
          <SelectTrigger aria-label="Rows per page" className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((value) => (
              <SelectItem key={String(value)} value={String(value)}>
                {SIZE_LABEL[String(value)]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <div className="flex items-center gap-2">
        {/* `aria-live` is deliberately absent: the screen's existing
            `role="status"` count line already announces the change, and two
            regions firing on one click read as a stutter. */}
        <span className="text-xs text-muted-foreground tabular-nums">
          Page {page} of {pageCount}
        </span>

        {/* Icon-only buttons carry real labels, not icon ambiguity. */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="First page"
            disabled={atStart}
            onClick={() => onPageChange(1)}
          >
            <ChevronFirst aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={atStart}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={atEnd}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Last page"
            disabled={atEnd}
            onClick={() => onPageChange(pageCount)}
          >
            <ChevronLast aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
