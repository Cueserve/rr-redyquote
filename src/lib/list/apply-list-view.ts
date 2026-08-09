/**
 * Filter, sort, and slice for the three list screens (/quotes, /products,
 * /library). Pure: no React, no routing, no knowledge of any row type.
 *
 * The options object is the seam that migrates to the server. When Supabase
 * reads land, `filter` / `compare` / `page` / `size` become `.eq()` / `.ilike()`
 * / `.order()` / `.range()` on the query builder and the URL contract does not
 * change (design spec §10).
 */

export type SortDir = "asc" | "desc";

/** `"all"` is what returns Ctrl+F to anyone who wants it (spec D3). */
export type PageSize = number | "all";

export interface ListViewOptions<T> {
  filter?: (row: T) => boolean;
  compare: (a: T, b: T) => number;
  page: number;
  size: PageSize;
}

export interface ListView<T> {
  /** The current page only. */
  rows: T[];
  /** Rows after filtering, before paging — what "of 312" counts. */
  total: number;
  pageCount: number;
  /** The requested page, clamped to `[1, pageCount]`. */
  page: number;
}

export function applyListView<T>(
  rows: T[],
  { filter, compare, page, size }: ListViewOptions<T>,
): ListView<T> {
  // `slice()` even when there is no filter: `sort` mutates in place, and these
  // rows arrive as props from a Server Component.
  //
  // Filter, then sort, then slice. Sorting before filtering wastes work and
  // paging before sorting is simply wrong.
  const filtered = filter ? rows.filter(filter) : rows.slice();
  filtered.sort(compare);

  const total = filtered.length;

  // A zero-row list is still "Page 1 of 1", not "Page 1 of 0".
  const pageCount = size === "all" ? 1 : Math.max(1, Math.ceil(total / size));

  // `Math.trunc(NaN)` is NaN and `NaN || 1` is 1, which is how a non-numeric
  // page arrives here as 1 rather than as an empty table (spec §6).
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), pageCount);

  const start = size === "all" ? 0 : (current - 1) * size;
  const end = size === "all" ? total : start + size;

  return { rows: filtered.slice(start, end), total, pageCount, page: current };
}

/** Text compares with `localeCompare`; `<` puts every lowercase name last. */
export function compareText(a: string, b: string): number {
  return a.localeCompare(b);
}

/** Numeric columns compare numerically, never as strings. */
export function compareNumber(a: number, b: number): number {
  return a - b;
}

/**
 * Ordered-enum compare for quote status and freshness. Status sorts
 * Draft → Review → Approved → Sent, never alphabetically — the
 * alphabetical order conveys nothing about where a quote sits.
 *
 * An unrecognised value ranks after every known one rather than throwing:
 * these values reach us from a URL and from fixture data, and a list screen
 * that 500s is worse than one showing a row in an odd position.
 */
export function compareRank<V extends string>(order: readonly V[]) {
  const rank = new Map<string, number>(
    order.map((value, index) => [value, index]),
  );
  return (a: V, b: V) =>
    (rank.get(a) ?? order.length) - (rank.get(b) ?? order.length);
}

/**
 * Builds a row comparator from a field selector, a value comparator, and a
 * direction.
 *
 * Direction is applied HERE rather than by the caller negating the whole
 * comparator, and that is the entire reason this function exists: `-compare`
 * flips nulls to the top the moment a column sorts descending. `vendor` is
 * nullable, and a descending sort that leads with every "No vendor" row is the
 * least useful thing it could do. The null test sits outside the negation so
 * nulls stay last in both directions (spec §3.2).
 *
 * Ties return 0 and `Array.prototype.sort` is stable (ES2019), so two rows with
 * equal cost keep their input order and do not swap between renders.
 */
export function byField<T, V>(
  select: (row: T) => V | null | undefined,
  compare: (a: V, b: V) => number,
  dir: SortDir,
): (a: T, b: T) => number {
  const sign = dir === "asc" ? 1 : -1;

  return (rowA, rowB) => {
    const a = select(rowA);
    const b = select(rowB);
    const aMissing = a === null || a === undefined;
    const bMissing = b === null || b === undefined;

    if (aMissing || bMissing) {
      if (aMissing && bMissing) return 0;
      return aMissing ? 1 : -1;
    }

    return sign * compare(a, b);
  };
}
