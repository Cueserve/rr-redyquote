"use client";

import * as React from "react";
import Link from "next/link";
import { Search, TriangleAlert } from "lucide-react";

import { QuoteStatusBadge } from "@/components/quote-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  QUOTE_STATUS_LABEL,
  QUOTE_STATUS_ORDER,
  type Quote,
  type QuoteStatus,
} from "@/lib/mock";
import { cn, formatDate, formatMoney, formatPercent } from "@/lib/utils";

// Client component for the search + status filter only. The rows themselves are
// rendered from props the Server Component fetched — filtering a list the user
// can already see is not a round trip.
//
// `"use client"` here is the justified exception PROJECT-STRUCTURE.md §4.6 asks
// for: filtering needs local state. Everything above it in the tree stays a
// Server Component.

type StatusFilter = QuoteStatus | "all";

export function QuoteTable({ quotes }: { quotes: Quote[] }) {
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");

  const needle = query.trim().toLowerCase();
  const rows = quotes.filter((quote) => {
    const matchesStatus = status === "all" || quote.status === status;
    const matchesQuery =
      needle === "" ||
      quote.quote_number.toLowerCase().includes(needle) ||
      quote.customer_name.toLowerCase().includes(needle) ||
      quote.product_name.toLowerCase().includes(needle);
    return matchesStatus && matchesQuery;
  });

  // An empty result has two causes here, and the copy has to name the one in
  // play — same reasoning as ProductTable. The status tabs are visible, but a
  // rep who typed a quote number while sitting on the Draft tab gets nothing
  // back and no statement of why, so both filters get named and both get a way
  // out. Interpolated with a trailing space so the two sentence shapes below
  // read correctly whether or not a status is selected.
  const statusWord =
    status === "all" ? "" : `${QUOTE_STATUS_LABEL[status].toLowerCase()} `;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs
          value={status}
          onValueChange={(next) => setStatus(next as StatusFilter)}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            {QUOTE_STATUS_ORDER.map((value) => (
              <TabsTrigger key={value} value={value}>
                {QUOTE_STATUS_LABEL[value]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search quote, customer, or product"
            aria-label="Search quotes"
            className="w-80 pl-9"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-border">
          <EmptyState>
            {quotes.length === 0 ? (
              <p>No quotes yet.</p>
            ) : (
              <p>
                {needle === ""
                  ? `No ${statusWord}quotes.`
                  : `No ${statusWord}quotes match “${query.trim()}”.`}
              </p>
            )}
            {needle !== "" || status !== "all" ? (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                {needle !== "" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuery("")}
                  >
                    Clear search
                  </Button>
                ) : null}
                {status !== "all" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStatus("all")}
                  >
                    Show all statuses
                  </Button>
                ) : null}
              </div>
            ) : null}
          </EmptyState>
        </div>
      ) : (
        <Table caption="Quotes">
          <TableHeader>
            <TableRow>
              <TableHead>Quote</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Qty tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Price each</TableHead>
              <TableHead className="text-right">GP%</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell numeric>
                  <Link href={`/quotes/${quote.id}`} className="font-semibold">
                    {quote.quote_number}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">
                  {quote.customer_name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {quote.product_name}
                </TableCell>
                <TableCell numeric className="text-right">
                  {quote.qty_tier}
                </TableCell>
                <TableCell>
                  <QuoteStatusBadge status={quote.status} />
                </TableCell>
                <TableCell numeric className="text-right">
                  {formatMoney(quote.final_price_each)}
                </TableCell>
                <TableCell
                  numeric
                  className={cn(
                    "text-right",
                    quote.below_margin_floor && "text-destructive",
                  )}
                >
                  <span className="inline-flex items-center justify-end gap-1.5">
                    {quote.below_margin_floor ? (
                      // PRD-016: advisory only. It marks the quote; it never
                      // blocks saving or submitting.
                      <Tooltip>
                        <TooltipTrigger aria-label="Below margin floor">
                          <TriangleAlert
                            className="size-3.5"
                            aria-hidden="true"
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          Below the configured margin floor. Advisory only —
                          this quote can still be saved and submitted.
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                    {formatPercent(quote.gp_percent)}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {quote.owner_name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(quote.updated_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* `role="status"` (polite + atomic) is what makes the filters audible:
          the status tabs and the search box rewrite the table with no page
          navigation, so without a live region a screen-reader user gets no
          confirmation the list changed, or that it went empty (WCAG 2.2 4.1.3).
          Matches ProductTable and ComponentTable. */}
      <p role="status" className="text-xs text-muted-foreground">
        Showing {rows.length} of {quotes.length} quotes.
      </p>
    </div>
  );
}
