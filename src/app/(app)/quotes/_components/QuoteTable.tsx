"use client";

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
import { LinkPending } from "@/components/ui/link-pending";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  QUOTE_STATUS_LABEL,
  QUOTE_STATUS_ORDER,
  type QuoteStatus,
} from "@/lib/mock";
import { cn, formatDate, formatMoney, formatPercent } from "@/lib/utils";
import {
  applyListView,
  byField,
  compareNumber,
  compareRank,
  compareText,
} from "@/lib/list/apply-list-view";
import type { ListParamsConfig } from "@/lib/list/list-params";
import { useListParams } from "@/lib/list/use-list-params";
import { Pagination } from "@/components/ui/pagination";

// The quote row structure we map from the nested Supabase response
export type DbQuoteRow = {
  id: string;
  quote_number: string;
  customer_name: string;
  product_name: string;
  qty_tier: number;
  status: QuoteStatus;
  final_price_each: number;
  gp_percent: number;
  below_margin_floor: boolean;
  owner_name: string;
  updated_at: string;
};

// Client component for search, the status filter, sorting, and pagination.
// The rows themselves are still rendered from props the Server Component
// fetched — reading the view state back out of the URL is not a round trip.
//
// `"use client"` here is the justified exception PROJECT-STRUCTURE.md §4.6 asks
// for: `useListParams` reads `useSearchParams()` and drives `useRouter()`,
// which only a Client Component can do. Everything above it in the tree stays
// a Server Component.

type StatusFilter = QuoteStatus | "all";

type QuoteSortKey =
  | "quote"
  | "customer"
  | "product"
  | "tier"
  | "status"
  | "price"
  | "gp"
  | "owner"
  | "updated";

const SORTS: Record<
  QuoteSortKey,
  (dir: "asc" | "desc") => (a: DbQuoteRow, b: DbQuoteRow) => number
> = {
  quote: (dir) =>
    byField((row: DbQuoteRow) => row.quote_number, compareText, dir),
  customer: (dir) =>
    byField((row: DbQuoteRow) => row.customer_name, compareText, dir),
  product: (dir) =>
    byField((row: DbQuoteRow) => row.product_name, compareText, dir),
  tier: (dir) => byField((row: DbQuoteRow) => row.qty_tier, compareNumber, dir),
  // Lifecycle order, reusing the same constant the tab row is built from, so
  // the two can never disagree. Alphabetical would give approved, draft,
  // review, sent — which conveys nothing about where a quote sits.
  status: (dir) =>
    byField(
      (row: DbQuoteRow) => row.status,
      compareRank(QUOTE_STATUS_ORDER),
      dir,
    ),
  price: (dir) =>
    byField((row: DbQuoteRow) => row.final_price_each, compareNumber, dir),
  gp: (dir) => byField((row: DbQuoteRow) => row.gp_percent, compareNumber, dir),
  owner: (dir) =>
    byField((row: DbQuoteRow) => row.owner_name, compareText, dir),
  // `updated_at` is an ISO timestamp, so lexical order is chronological.
  updated: (dir) =>
    byField((row: DbQuoteRow) => row.updated_at, compareText, dir),
};

const LIST_CONFIG: ListParamsConfig<QuoteSortKey> = {
  sortKeys: Object.keys(SORTS) as QuoteSortKey[],
  // A rep opens Quotes to resume yesterday's work, so the most recently touched
  // quote is the one they want on top (spec D5).
  defaultSort: "updated",
  defaultDir: "desc",
  filterDefaults: { status: "all" },
};

export function QuoteTable({ quotes }: { quotes: DbQuoteRow[] }) {
  const list = useListParams(LIST_CONFIG);
  const { params } = list;
  const rawStatus = list.filter("status", "all");
  // An unrecognised status in the URL falls back to "all" rather than matching
  // nothing: unlike a category id, the four lifecycle states are a closed set
  // that cannot be deleted, so an unknown value here is a typo, not a stale
  // reference to something real.
  const status: StatusFilter = (QUOTE_STATUS_ORDER as string[]).includes(
    rawStatus,
  )
    ? (rawStatus as QuoteStatus)
    : "all";

  const needle = params.q.toLowerCase();
  const view = applyListView(quotes, {
    filter: (quote) => {
      const matchesStatus = status === "all" || quote.status === status;
      const matchesQuery =
        needle === "" ||
        quote.quote_number.toLowerCase().includes(needle) ||
        quote.customer_name.toLowerCase().includes(needle) ||
        quote.product_name.toLowerCase().includes(needle);
      return matchesStatus && matchesQuery;
    },
    compare: SORTS[params.sort](params.dir),
    page: params.page,
    size: params.size,
  });

  const rows = view.rows;
  const firstRow =
    params.size === "all" ? 1 : (view.page - 1) * params.size + 1;
  const lastRow = firstRow + rows.length - 1;

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
          onValueChange={(next) =>
            list.setFilter("status", next === "all" ? null : next)
          }
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
            value={list.query}
            onChange={(event) => list.setQuery(event.target.value)}
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
                {params.q === ""
                  ? `No ${statusWord}quotes.`
                  : `No ${statusWord}quotes match “${params.q}”.`}
              </p>
            )}
            {needle !== "" || status !== "all" ? (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                {needle !== "" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => list.setQuery("")}
                  >
                    Clear search
                  </Button>
                ) : null}
                {status !== "all" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => list.setFilter("status", null)}
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
              <TableHead
                sortKey="quote"
                sortState={list.sortStateFor("quote")}
                onSort={(key) => list.toggleSort(key as QuoteSortKey)}
              >
                Quote
              </TableHead>
              <TableHead
                sortKey="customer"
                sortState={list.sortStateFor("customer")}
                onSort={(key) => list.toggleSort(key as QuoteSortKey)}
              >
                Customer
              </TableHead>
              <TableHead
                sortKey="product"
                sortState={list.sortStateFor("product")}
                onSort={(key) => list.toggleSort(key as QuoteSortKey)}
              >
                Product
              </TableHead>
              <TableHead
                className="text-right"
                sortKey="tier"
                sortState={list.sortStateFor("tier")}
                onSort={(key) => list.toggleSort(key as QuoteSortKey)}
              >
                Qty tier
              </TableHead>
              <TableHead
                sortKey="status"
                sortState={list.sortStateFor("status")}
                onSort={(key) => list.toggleSort(key as QuoteSortKey)}
              >
                Status
              </TableHead>
              <TableHead
                className="text-right"
                sortKey="price"
                sortState={list.sortStateFor("price")}
                onSort={(key) => list.toggleSort(key as QuoteSortKey)}
              >
                Price each
              </TableHead>
              <TableHead
                className="text-right"
                sortKey="gp"
                sortState={list.sortStateFor("gp")}
                onSort={(key) => list.toggleSort(key as QuoteSortKey)}
              >
                GP%
              </TableHead>
              <TableHead
                sortKey="owner"
                sortState={list.sortStateFor("owner")}
                onSort={(key) => list.toggleSort(key as QuoteSortKey)}
              >
                Owner
              </TableHead>
              <TableHead
                sortKey="updated"
                sortState={list.sortStateFor("updated")}
                onSort={(key) => list.toggleSort(key as QuoteSortKey)}
              >
                Updated
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((quote) => (
              <TableRow key={quote.id}>
                {/* The row's name cell, so cell-by-cell navigation says which
                    quote each value belongs to. Matches ProductTable and
                    ComponentTable. */}
                <TableCell header numeric>
                  {/* `LinkPending` must live inside the Link — it reads that
                      Link's navigation status. The detail route has no
                      `loading.tsx` on purpose (it would turn a 404 into a
                      200), so this is the only click feedback the row has. */}
                  <Link
                    href={`/quotes/${quote.id}`}
                    className="inline-flex items-center gap-1.5 font-semibold"
                  >
                    {quote.quote_number}
                    <LinkPending
                      label={`Opening quote ${quote.quote_number}`}
                    />
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

      {view.total > 0 ? (
        <Pagination
          page={view.page}
          pageCount={view.pageCount}
          size={params.size}
          onPageChange={list.setPage}
          onSizeChange={list.setSize}
        />
      ) : null}

      {/* `role="status"` (polite + atomic) is what makes the filters audible:
          the status tabs, the search box, a sort click and a page turn
          rewrite the table with no page navigation, so without a live region a
          screen-reader user gets no confirmation the list changed, or that it
          went empty (WCAG 2.2 4.1.3). Matches ProductTable and
          ComponentTable. */}
      <p role="status" className="text-xs text-muted-foreground">
        {view.total === 0
          ? `Showing 0 of ${quotes.length} quotes.`
          : `Showing ${firstRow} to ${lastRow} of ${view.total} quotes.`}
      </p>
    </div>
  );
}
