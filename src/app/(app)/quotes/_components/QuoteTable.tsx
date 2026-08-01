"use client";

import * as React from "react";
import Link from "next/link";
import { Search, TriangleAlert } from "lucide-react";

import { QuoteStatusBadge } from "@/components/quote-status-badge";
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
            <p>No quotes match this filter.</p>
          </EmptyState>
        </div>
      ) : (
        <Table>
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
                        <TooltipTrigger asChild>
                          <TriangleAlert
                            className="size-3.5"
                            aria-label="Below margin floor"
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

      <p className="text-xs text-muted-foreground">
        Showing {rows.length} of {quotes.length} quotes.
      </p>
    </div>
  );
}
