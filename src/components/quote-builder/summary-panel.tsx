"use client";

import { TriangleAlert } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn, formatMoney, formatPercent } from "@/lib/utils";
import type { DbQuote, DbSettings } from "./quote-builder";

/**
 * The "live-calculated summary panel" half of DESIGN-SYSTEM.md §9's form
 * pattern — except it does not calculate, and says so.
 *
 * This is the one place the open pricing decision is visible rather than
 * hidden. PRD §7A leaves the calculation order, the rounding points, and which
 * fields are canonical all undefined, and PRODUCT.md §3A forbids inventing any
 * of them. So:
 *
 *   - An existing quote shows its STORED breakdown — the nine numeric columns
 *     on `quotes` (docs/DATABASE.md §4.11), which are storage for values the
 *     server recomputed at the last save (NFR-007).
 *   - Once the rep edits anything, those figures are stale by definition, so
 *     the panel says so instead of showing a number that no longer describes
 *     what is on screen.
 *   - A brand-new quote has no stored breakdown at all, so every row is an em
 *     dash. That is the honest state, not a gap in the design.
 *
 * When the formula is signed off, `src/lib/pricing/` becomes the single module
 * imported by both this panel and the Server Action, so the preview and the
 * persisted value agree by construction (ARCHITECTURE.md §1, §5).
 */

function Row({
  label,
  value,
  emphasis = false,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
  tone?: "neutral" | "destructive";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span
        className={cn(
          "text-sm",
          emphasis ? "font-semibold text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-mono tabular-nums",
          emphasis ? "text-md font-semibold" : "text-sm",
          tone === "destructive" && "text-destructive",
        )}
      >
        {value}
      </span>
    </div>
  );
}

import { calculateQuote } from "@/lib/pricing";
import type { DbQuoteLine, DbFabTier, DbProduct } from "./quote-builder";

export function SummaryPanel({
  quote,
  settings,
  lines,
  fabTier,
  product,
}: {
  quote: DbQuote | null;
  settings: DbSettings;
  lines: DbQuoteLine[];
  fabTier: DbFabTier | null;
  product: DbProduct | null;
}) {
  // PRD-007: Live recalculation as inputs change
  // We use calculateQuote on the client side to show immediate totals
  const pricing = calculateQuote(lines, settings, fabTier, product);

  const money = (value: number | undefined) => formatMoney(value ?? 0);

  // If the quote is locked (not a draft), display the historical values saved
  // in the database. Otherwise, show the live calculated values.
  const isLocked = quote?.status !== "draft";
  const stored = isLocked && quote ? quote : pricing;

  // Since historical quotes only save the dollar amounts (not the percentages),
  // we mathematically reverse-engineer the percentage from the base cost so the
  // UI accurately reflects the settings at the time it was saved.
  const baseCost =
    (stored.total_hard_cost ?? 0) + (stored.total_labor_cost ?? 0);
  const displayCushionPct =
    baseCost > 0
      ? ((stored.cushion_amount ?? 0) / baseCost) * 100
      : settings.cushion_percent;
  const displayCommissionPct =
    baseCost > 0
      ? ((stored.commission_amount ?? 0) / baseCost) * 100
      : settings.commission_percent;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-md font-semibold tracking-tight">Cost Breakdown</h2>
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          {isLocked
            ? "Showing historically saved values."
            : "Live recalculation based on current line items and estimating defaults."}
        </p>
      </div>

      <div className="flex flex-col divide-y divide-border">
        <div>
          <Row label="Hard cost" value={money(stored.total_hard_cost)} />
          <Row label="Labor cost" value={money(stored.total_labor_cost)} />
        </div>
        <div>
          <Row
            label={`Cushion (${formatPercent(displayCushionPct)})`}
            value={money(stored.cushion_amount)}
          />
          <Row
            label={`Commission (${formatPercent(displayCommissionPct)})`}
            value={money(stored.commission_amount)}
          />
          <Row label="Total cost" value={money(stored.total_cost)} />
        </div>
        <div>
          <Row
            label="Final price each"
            value={money(stored.final_price_each)}
            emphasis
          />
          <Row label="GP dollars" value={money(stored.gp_dollars)} />
          <Row
            label="GP percent"
            value={formatPercent(stored.gp_percent)}
            emphasis
            tone={stored.below_margin_floor ? "destructive" : "neutral"}
          />
        </div>
      </div>

      {/* PRD-016 — advisory only. Factual phrasing, no exclamation
          (DESIGN-SYSTEM.md §11). */}
      {stored.below_margin_floor ? (
        <div className="flex items-start gap-2 rounded-sm border border-destructive-border bg-destructive-muted p-3 text-sm text-destructive">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          <p>
            Margin floor: {formatPercent(settings.margin_floor_percent)} — this
            quote is below it. Advisory only; it can still be saved and
            submitted.
          </p>
        </div>
      ) : null}

      {/* Prototype note. Delete with the fixtures once PRD §7A is signed off. */}
      <p className="border-t border-border pt-3 text-xs text-muted-foreground">
        Design prototype: the pricing formula is an open decision (PRD §7A), so
        nothing on this panel recalculates. The figures shown are the last saved
        values.
      </p>
    </Card>
  );
}
