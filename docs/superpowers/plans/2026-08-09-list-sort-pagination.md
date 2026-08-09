# List Sort and Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add column sorting and pagination to `/quotes`, `/products`, and `/library`, and move each screen's existing filter state out of `useState` and into the URL.

**Architecture:** One pure, generic module (`src/lib/list/`) owns filtering, sorting, slicing, and URL-param normalization with no React and no routing. A thin client hook is the only thing that touches `useSearchParams` and the router. Two `src/components/ui/` primitives gain the affordances — `TableHead` gets sort props, and a new `Pagination` component renders the pager. Each of the three screens keeps its own comparator map, because each owns its own row type.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Vitest, Tailwind v4 semantic tokens, shadcn primitives in `src/components/ui/`.

**Source spec:** [docs/superpowers/specs/2026-08-09-list-sort-pagination-design.md](../specs/2026-08-09-list-sort-pagination-design.md). Where this plan and the spec disagree, the spec wins — except for the one deviation recorded below, which was made deliberately.

**Two deviations from the spec, both deliberate.**

1. **§3 file count.** The spec lists three files under `src/lib/list/`. This plan uses five: `list-params.ts` / `list-params.test.ts` are split out of `use-list-params.ts` so the param normalization in §6 can be unit-tested without importing a `"use client"` module into a Node-environment Vitest run. There is no jsdom, no `@testing-library`, and no React test setup in this repo, and adding one is not in TECH-STACK.md. The hook stays the only thing that touches `useSearchParams` and the router, which is the property §3 actually cares about.
2. **§5.1 `total` prop.** `Pagination` does not take `total`. §7 puts the count sentence in each screen's existing `role="status"` line and warns against a second live region, which leaves `total` with no job inside the pager — an unused prop that lint would flag. The count still reaches the user; it is rendered one element away.

## Global Constraints

- **npm only.** No pnpm, no yarn. No new runtime or dev dependency of any kind — everything below uses what is already installed.
- **Semantic tokens only.** Never a hex literal, never a raw Tailwind palette class (`bg-slate-100`, `text-gray-500`). `eslint.config.mjs` fails the build on both. Colors come from `bg-background`, `text-muted-foreground`, `border-input`, and the rest of the semantic layer in `src/app/globals.css`.
- **`src/components/ui/` stays app-agnostic** (PROJECT-STRUCTURE.md §3). No import of `@/lib/mock`, no routing, no knowledge of quotes/products/components.
- **`data-table.tsx` does not become a column-def abstraction.** Its own header comment rules that out and spec §9 rejects it explicitly.
- **Never throw on a bad URL param.** Normalize silently, per spec §6.
- **Nulls sort last in both directions**, per spec §3.2.
- **Ship gate on every task:** `npm run lint` and `npm run typecheck` both clean. A change that fails either was never valid.
- **No `"use client"` directive in `src/components/ui/`** — every file there is imported by an already-client consumer, matching `button.tsx`, `select.tsx`, and `data-table.tsx`.
- **Comment the why, not the what.** Every non-obvious choice gets a comment in the house style — see any existing file in `src/components/ui/`.
- **Do not touch** `src/lib/mock/`, any Server Action (none exist), any migration, or anything under `docs/` other than what this plan names.

---

### Task 1: The pure list view function and its comparators

**Files:**

- Create: `src/lib/list/apply-list-view.ts`
- Test: `src/lib/list/apply-list-view.test.ts`
- Modify: `vitest.config.ts` (remove `passWithNoTests`)

**Interfaces:**

- Consumes: nothing.
- Produces:
  - `type SortDir = "asc" | "desc"`
  - `type PageSize = number | "all"`
  - `applyListView<T>(rows: T[], options: { filter?: (row: T) => boolean; compare: (a: T, b: T) => number; page: number; size: PageSize }): { rows: T[]; total: number; pageCount: number; page: number }`
  - `byField<T, V>(select: (row: T) => V | null | undefined, compare: (a: V, b: V) => number, dir: SortDir): (a: T, b: T) => number`
  - `compareText(a: string, b: string): number`
  - `compareNumber(a: number, b: number): number`
  - `compareRank<V extends string>(order: readonly V[]): (a: V, b: V) => number`

- [ ] **Step 1: Write the failing test**

Create `src/lib/list/apply-list-view.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  applyListView,
  byField,
  compareNumber,
  compareRank,
  compareText,
} from "./apply-list-view";

type Row = { id: string; name: string; cost: number; vendor: string | null };

const rows: Row[] = [
  { id: "a", name: "Alpha", cost: 30, vendor: "Acme" },
  { id: "b", name: "bravo", cost: 10, vendor: null },
  { id: "c", name: "Charlie", cost: 20, vendor: "Zenith" },
  { id: "d", name: "Delta", cost: 20, vendor: null },
];

const byName = byField<Row, string>((row) => row.name, compareText, "asc");
const ids = (result: { rows: Row[] }) => result.rows.map((row) => row.id);

describe("applyListView", () => {
  it("returns an empty page and a pageCount of 1 for no rows", () => {
    const result = applyListView([], { compare: byName, page: 1, size: 50 });
    expect(result).toEqual({ rows: [], total: 0, pageCount: 1, page: 1 });
  });

  it("returns every row when they fit on one page", () => {
    const result = applyListView(rows, { compare: byName, page: 1, size: 50 });
    expect(ids(result)).toEqual(["a", "b", "c", "d"]);
    expect(result.total).toBe(4);
    expect(result.pageCount).toBe(1);
  });

  it("filters before it sorts and pages", () => {
    const result = applyListView(rows, {
      filter: (row) => row.cost >= 20,
      compare: byName,
      page: 1,
      size: 50,
    });
    expect(ids(result)).toEqual(["a", "c", "d"]);
    expect(result.total).toBe(3);
  });

  it("does not mutate the array it was given", () => {
    const input = [...rows];
    applyListView(input, { compare: byName, page: 1, size: 50 });
    expect(input.map((row) => row.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("splits an exact multiple of size into full pages with no empty tail", () => {
    const result = applyListView(rows, { compare: byName, page: 2, size: 2 });
    expect(ids(result)).toEqual(["c", "d"]);
    expect(result.pageCount).toBe(2);
  });

  it("puts every row on one page when size is all", () => {
    const result = applyListView(rows, {
      compare: byName,
      page: 1,
      size: "all",
    });
    expect(result.rows).toHaveLength(4);
    expect(result.pageCount).toBe(1);
  });

  it("clamps a page below 1 up to 1", () => {
    const result = applyListView(rows, { compare: byName, page: 0, size: 2 });
    expect(result.page).toBe(1);
    expect(ids(result)).toEqual(["a", "b"]);
  });

  it("clamps a page beyond the range down to the last page", () => {
    const result = applyListView(rows, { compare: byName, page: 99, size: 3 });
    expect(result.page).toBe(2);
    expect(ids(result)).toEqual(["d"]);
  });

  it("clamps a non-numeric page to 1", () => {
    const result = applyListView(rows, {
      compare: byName,
      page: Number.NaN,
      size: 2,
    });
    expect(result.page).toBe(1);
  });
});

describe("byField", () => {
  it("sorts text with localeCompare, not codepoint order", () => {
    // "bravo" beats "Charlie" only under localeCompare; `<` puts every
    // lowercase name after every uppercase one.
    const result = applyListView(rows, { compare: byName, page: 1, size: 50 });
    expect(ids(result)).toEqual(["a", "b", "c", "d"]);
  });

  it("sorts nulls last ascending", () => {
    const compare = byField<Row, string>(
      (row) => row.vendor,
      compareText,
      "asc",
    );
    const result = applyListView(rows, { compare, page: 1, size: 50 });
    expect(ids(result)).toEqual(["a", "c", "b", "d"]);
  });

  it("sorts nulls last descending too", () => {
    const compare = byField<Row, string>(
      (row) => row.vendor,
      compareText,
      "desc",
    );
    const result = applyListView(rows, { compare, page: 1, size: 50 });
    expect(ids(result)).toEqual(["c", "a", "b", "d"]);
  });

  it("keeps tied rows in their input order", () => {
    const compare = byField<Row, number>(
      (row) => row.cost,
      compareNumber,
      "asc",
    );
    const result = applyListView(rows, { compare, page: 1, size: 50 });
    // c and d both cost 20 and must not swap.
    expect(ids(result)).toEqual(["b", "c", "d", "a"]);
  });

  it("keeps tied rows in input order descending as well", () => {
    const compare = byField<Row, number>(
      (row) => row.cost,
      compareNumber,
      "desc",
    );
    const result = applyListView(rows, { compare, page: 1, size: 50 });
    expect(ids(result)).toEqual(["a", "c", "d", "b"]);
  });
});

describe("compareRank", () => {
  const STATUS = ["draft", "pending_approval", "approved", "sent"] as const;
  type Status = (typeof STATUS)[number];
  type StatusRow = { id: string; status: Status };

  it("sorts by lifecycle order, not alphabetically", () => {
    const statusRows: StatusRow[] = [
      { id: "sent", status: "sent" },
      { id: "approved", status: "approved" },
      { id: "draft", status: "draft" },
      { id: "pending", status: "pending_approval" },
    ];
    const compare = byField<StatusRow, Status>(
      (row) => row.status,
      compareRank(STATUS),
      "asc",
    );
    const result = applyListView(statusRows, {
      compare,
      page: 1,
      size: 50,
    });
    expect(result.rows.map((row) => row.id)).toEqual([
      "draft",
      "pending",
      "approved",
      "sent",
    ]);
  });

  it("sorts freshness Current then Aging then Re-quote", () => {
    const FRESHNESS = ["current", "aging", "requote"] as const;
    type Freshness = (typeof FRESHNESS)[number];
    type FreshRow = { id: string; freshness: Freshness };
    const freshRows: FreshRow[] = [
      { id: "r", freshness: "requote" },
      { id: "c", freshness: "current" },
      { id: "a", freshness: "aging" },
    ];
    const compare = byField<FreshRow, Freshness>(
      (row) => row.freshness,
      compareRank(FRESHNESS),
      "asc",
    );
    const result = applyListView(freshRows, { compare, page: 1, size: 50 });
    expect(result.rows.map((row) => row.id)).toEqual(["c", "a", "r"]);
  });

  it("sorts an unknown value after every known one instead of throwing", () => {
    const compare = compareRank(STATUS);
    expect(compare("sent", "nonsense" as Status)).toBeLessThan(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test`
Expected: FAIL — `Failed to resolve import "./apply-list-view"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/list/apply-list-view.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test`
Expected: PASS — 3 suites, all cases green.

- [ ] **Step 5: Remove `passWithNoTests`**

The first real test in this repo has landed, which is what the comment in `vitest.config.ts` already instructs. Delete the whole comment block and the flag, leaving:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit tests are co-located as `*.test.ts` next to the module under test
    // (PROJECT-STRUCTURE.md §1). Playwright specs live in `e2e/` as `*.spec.ts`
    // and must never be picked up here — hence `.test.ts`, not a bare glob.
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 6: Verify the flag removal did not break the run**

Run: `npm run test`
Expected: PASS, same case count. A broken `include` glob now fails instead of passing silently, which is the point.

- [ ] **Step 7: Ship gate**

Run: `npm run lint && npm run typecheck`
Expected: both clean.

- [ ] **Step 8: Commit**

```bash
git add src/lib/list/apply-list-view.ts src/lib/list/apply-list-view.test.ts vitest.config.ts
git commit -m "feat(list): add the pure list view function and its comparators"
```

---

### Task 2: URL param reading and serialization

**Files:**

- Create: `src/lib/list/list-params.ts`
- Test: `src/lib/list/list-params.test.ts`

**Interfaces:**

- Consumes: `SortDir`, `PageSize` from `./apply-list-view`.
- Produces:
  - `PAGE_SIZES: readonly [25, 50, 100, "all"]`
  - `DEFAULT_PAGE_SIZE = 50`
  - `type ListParamsConfig<K extends string> = { sortKeys: readonly K[]; defaultSort: K; defaultDir: SortDir; filterDefaults?: Record<string, string> }`
  - `type ListParams<K extends string> = { q: string; sort: K; dir: SortDir; page: number; size: PageSize }`
  - `readListParams<K extends string>(search: URLSearchParams, config: ListParamsConfig<K>): ListParams<K>`
  - `readFilter(search: URLSearchParams, name: string, fallback: string): string`
  - `buildListSearch<K extends string>(current: URLSearchParams, patch: Record<string, string | number | null>, config: ListParamsConfig<K>): string`

- [ ] **Step 1: Write the failing test**

Create `src/lib/list/list-params.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  buildListSearch,
  readFilter,
  readListParams,
  type ListParamsConfig,
} from "./list-params";

type Key = "name" | "cost" | "updated";

const config: ListParamsConfig<Key> = {
  sortKeys: ["name", "cost", "updated"],
  defaultSort: "name",
  defaultDir: "asc",
  filterDefaults: { deactivated: "0", category: "all" },
};

const read = (query: string) =>
  readListParams(new URLSearchParams(query), config);

const build = (query: string, patch: Record<string, string | number | null>) =>
  buildListSearch(new URLSearchParams(query), patch, config);

describe("readListParams", () => {
  it("returns the defaults for an empty query string", () => {
    expect(read("")).toEqual({
      q: "",
      sort: "name",
      dir: "asc",
      page: 1,
      size: 50,
    });
  });

  it("reads every param when all are present", () => {
    expect(read("q=widget&sort=cost&dir=desc&page=3&size=25")).toEqual({
      q: "widget",
      sort: "cost",
      dir: "desc",
      page: 3,
      size: 25,
    });
  });

  it("falls back to the default sort for an unknown key", () => {
    expect(read("sort=nonsense").sort).toBe("name");
  });

  it("falls back to the default direction for an unknown sort key", () => {
    // The direction belongs to the sort that is actually in effect, so a
    // discarded sort key discards its direction with it.
    expect(read("sort=nonsense&dir=desc").dir).toBe("asc");
  });

  it("falls back to the default direction for an invalid dir", () => {
    expect(read("sort=cost&dir=sideways").dir).toBe("asc");
  });

  it("keeps an explicit direction on a valid sort key", () => {
    expect(read("sort=cost&dir=desc").dir).toBe("desc");
  });

  it("normalises a non-numeric page to 1", () => {
    expect(read("page=abc").page).toBe(1);
  });

  it("normalises a page below 1 to 1", () => {
    expect(read("page=0").page).toBe(1);
    expect(read("page=-4").page).toBe(1);
  });

  it("leaves an out-of-range page for applyListView to clamp", () => {
    // pageCount is not knowable here — it depends on the filtered row count.
    expect(read("page=9999").page).toBe(9999);
  });

  it("normalises an unsupported size to 50", () => {
    expect(read("size=7").size).toBe(50);
    expect(read("size=everything").size).toBe(50);
  });

  it("accepts all as a size", () => {
    expect(read("size=all").size).toBe("all");
  });

  it("trims the search term", () => {
    expect(read("q=%20%20widget%20%20").q).toBe("widget");
  });
});

describe("readFilter", () => {
  it("returns the fallback when the param is absent", () => {
    expect(readFilter(new URLSearchParams(""), "category", "all")).toBe("all");
  });

  it("returns the raw value when present", () => {
    expect(
      readFilter(new URLSearchParams("category=cat-1"), "category", "all"),
    ).toBe("cat-1");
  });
});

describe("buildListSearch", () => {
  it("omits every param equal to its default", () => {
    expect(build("", { sort: "name", dir: "asc", page: 1, size: 50 })).toBe("");
  });

  it("keeps only the params that differ from their defaults", () => {
    expect(build("", { sort: "cost", dir: "desc" })).toBe("sort=cost&dir=desc");
  });

  it("drops a param set back to its default", () => {
    expect(build("sort=cost&dir=desc", { sort: "name", dir: "asc" })).toBe("");
  });

  it("drops a param set to null", () => {
    expect(build("q=widget", { q: null })).toBe("");
  });

  it("resets page to 1 when the search term changes", () => {
    expect(build("page=4", { q: "widget" })).toBe("q=widget");
  });

  it("resets page to 1 when a filter changes", () => {
    expect(build("page=4", { deactivated: "1" })).toBe("deactivated=1");
  });

  it("resets page to 1 when the size changes", () => {
    expect(build("page=4", { size: 25 })).toBe("size=25");
  });

  it("does not reset page when only the page changes", () => {
    expect(build("q=widget", { page: 3 })).toBe("q=widget&page=3");
  });

  it("preserves params it was not asked to change", () => {
    expect(build("q=widget&sort=cost&dir=desc", { page: 2 })).toBe(
      "q=widget&sort=cost&dir=desc&page=2",
    );
  });

  it("drops a filter set back to its configured default", () => {
    expect(build("category=cat-1", { category: "all" })).toBe("");
  });

  it("emits params in a stable order regardless of patch order", () => {
    // No `page` in the patch: any non-page key resets it, so including one
    // would test the reset rule rather than the ordering.
    expect(build("", { size: 25, dir: "desc", q: "a", sort: "cost" })).toBe(
      "q=a&sort=cost&dir=desc&size=25",
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test`
Expected: FAIL — `Failed to resolve import "./list-params"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/list/list-params.ts`:

```ts
import type { PageSize, SortDir } from "./apply-list-view";

/**
 * The URL contract for the three list screens (design spec §4), as pure
 * functions over `URLSearchParams`.
 *
 * Split out of `use-list-params.ts` so it can be unit-tested in Vitest's node
 * environment: that file is a client module importing `next/navigation`, and
 * this repo has no jsdom and no React test setup.
 *
 * Rule for everything below: never throw on a bad param. Normalise silently. A
 * list route that 500s because someone truncated a URL is a worse outcome than
 * one showing the default view (spec §6).
 */

export const PAGE_SIZES = [25, 50, 100, "all"] as const;
export const DEFAULT_PAGE_SIZE = 50;

export interface ListParamsConfig<K extends string> {
  /** The screen's sortable keys. Anything else in the URL is discarded. */
  sortKeys: readonly K[];
  defaultSort: K;
  defaultDir: SortDir;
  /**
   * The screen's own filter params and their defaults. A param equal to its
   * default is removed from the URL, so `/library` stays the canonical URL for
   * the default view and only meaningful state is ever visible.
   */
  filterDefaults?: Record<string, string>;
}

export interface ListParams<K extends string> {
  q: string;
  sort: K;
  dir: SortDir;
  page: number;
  size: PageSize;
}

/**
 * Emission order for `buildListSearch`. Fixed rather than insertion-ordered so
 * the same view always produces the same URL and a shared link compares equal.
 */
const PARAM_ORDER = ["q", "sort", "dir", "page", "size"] as const;

function readSize(raw: string | null): PageSize {
  if (raw === "all") return "all";
  const value = Number(raw);
  return (PAGE_SIZES as readonly (number | string)[]).includes(value)
    ? value
    : DEFAULT_PAGE_SIZE;
}

export function readListParams<K extends string>(
  search: URLSearchParams,
  config: ListParamsConfig<K>,
): ListParams<K> {
  const rawSort = search.get("sort");
  const sortIsValid =
    rawSort !== null &&
    (config.sortKeys as readonly string[]).includes(rawSort);
  const sort = sortIsValid ? (rawSort as K) : config.defaultSort;

  // A direction only means something attached to a sort key. If the key was
  // discarded, its direction goes with it rather than being applied to the
  // default sort, which would silently produce a third view nobody asked for.
  const rawDir = search.get("dir");
  const dir: SortDir =
    sortIsValid && (rawDir === "asc" || rawDir === "desc")
      ? rawDir
      : config.defaultDir;

  const rawPage = Math.trunc(Number(search.get("page")));
  // The upper bound is not knowable here — it depends on the filtered row
  // count — so `applyListView` clamps it. This only floors it.
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  return {
    q: (search.get("q") ?? "").trim(),
    sort,
    dir,
    page,
    size: readSize(search.get("size")),
  };
}

/** Screen filters are opaque strings here; the screen validates its own. */
export function readFilter(
  search: URLSearchParams,
  name: string,
  fallback: string,
): string {
  return search.get(name) ?? fallback;
}

export function buildListSearch<K extends string>(
  current: URLSearchParams,
  patch: Record<string, string | number | null>,
  config: ListParamsConfig<K>,
): string {
  const next = new URLSearchParams(current.toString());

  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === "") next.delete(key);
    else next.set(key, String(value));
  }

  // Any change other than the page itself resets the page. Without this a user
  // filters down to three results while sitting on page 4 and is shown a blank
  // table (spec §4.2).
  if (Object.keys(patch).some((key) => key !== "page")) next.delete("page");

  const defaults: Record<string, string> = {
    q: "",
    sort: config.defaultSort,
    dir: config.defaultDir,
    page: "1",
    size: String(DEFAULT_PAGE_SIZE),
    ...config.filterDefaults,
  };

  for (const [key, value] of Object.entries(defaults)) {
    if (next.get(key) === value) next.delete(key);
  }

  const ordered = new URLSearchParams();
  for (const key of PARAM_ORDER) {
    const value = next.get(key);
    if (value !== null) ordered.set(key, value);
  }
  // Screen filters follow the shared params, in config order.
  for (const key of Object.keys(config.filterDefaults ?? {})) {
    const value = next.get(key);
    if (value !== null) ordered.set(key, value);
  }

  return ordered.toString();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test`
Expected: PASS — both files green.

- [ ] **Step 5: Ship gate**

Run: `npm run lint && npm run typecheck`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/list/list-params.ts src/lib/list/list-params.test.ts
git commit -m "feat(list): add URL param reading and serialisation"
```

---

### Task 3: The client hook

**Files:**

- Create: `src/lib/list/use-list-params.ts`

**Interfaces:**

- Consumes: everything from `./list-params`, `SortDir` and `PageSize` from `./apply-list-view`.
- Produces: `useListParams<K extends string>(config: ListParamsConfig<K>)` returning
  `{ params: ListParams<K>; query: string; setQuery(next: string): void; toggleSort(key: K): void; sortStateFor(key: K): "asc" | "desc" | null; setPage(next: number): void; setSize(next: PageSize): void; filter(name: string, fallback: string): string; setFilter(name: string, value: string | null): void; reset(): void }`

There is no unit test for this task. Vitest here runs in a node environment with no jsdom and no `@testing-library/react`, and adding either is a new dependency outside TECH-STACK.md. Everything worth testing was pushed into `list-params.ts` in Task 2; what remains is React and router wiring, verified by the build and by the manual pass in Tasks 6–8.

- [ ] **Step 1: Write the hook**

Create `src/lib/list/use-list-params.ts`:

```ts
"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { PageSize, SortDir } from "./apply-list-view";
import {
  buildListSearch,
  readFilter,
  readListParams,
  type ListParamsConfig,
} from "./list-params";

/**
 * The only module in the app that touches `useSearchParams` and the router
 * (design spec §3). Everything it computes comes from `list-params.ts`, which
 * is pure and tested.
 *
 * Reading `useSearchParams` makes the three list routes dynamic (`ƒ`) where
 * they are currently static (`○`). That is expected and accepted (spec §4.3).
 */

/** Search debounces and replaces; every other control pushes (spec §4.1). */
const SEARCH_DEBOUNCE_MS = 250;

export function useListParams<K extends string>(config: ListParamsConfig<K>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = React.useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );
  const params = readListParams(search, config);

  // The search box is a controlled input, so it cannot wait 250 ms for the URL
  // to come back — it needs a local buffer. `committed` is how the buffer
  // resyncs when the URL changes from outside (Back, or a link), without
  // clobbering what the user is mid-way through typing.
  const [draft, setDraft] = React.useState(params.q);
  const committed = React.useRef(params.q);
  if (committed.current !== params.q) {
    committed.current = params.q;
    if (draft !== params.q) setDraft(params.q);
  }

  const commit = React.useCallback(
    (
      patch: Record<string, string | number | null>,
      mode: "push" | "replace",
    ) => {
      const query = buildListSearch(search, patch, config);
      const url = query ? `${pathname}?${query}` : pathname;
      // `scroll: false` on every one of these: re-sorting a table the user is
      // already looking at should not throw them back to the page heading.
      if (mode === "replace") router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [config, pathname, router, search],
  );

  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const setQuery = React.useCallback(
    (next: string) => {
      setDraft(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        committed.current = next.trim();
        // A keystroke is not something anyone wants to undo with Back, and one
        // search term should not leave twelve history entries.
        commit({ q: next.trim() || null }, "replace");
      }, SEARCH_DEBOUNCE_MS);
    },
    [commit],
  );

  const sortStateFor = React.useCallback(
    (key: K): SortDir | null => (params.sort === key ? params.dir : null),
    [params.dir, params.sort],
  );

  const toggleSort = React.useCallback(
    (key: K) => {
      // First click on a new column takes that column's natural direction —
      // ascending for text, and the screen's default direction for the column
      // that is already the default. Clicking the active column flips it.
      const next: SortDir =
        params.sort === key ? (params.dir === "asc" ? "desc" : "asc") : "asc";
      commit({ sort: key, dir: next }, "push");
    },
    [commit, params.dir, params.sort],
  );

  return {
    params,
    query: draft,
    setQuery,
    toggleSort,
    sortStateFor,
    setPage: React.useCallback(
      (next: number) => commit({ page: next }, "push"),
      [commit],
    ),
    setSize: React.useCallback(
      (next: PageSize) => commit({ size: String(next) }, "push"),
      [commit],
    ),
    filter: React.useCallback(
      (name: string, fallback: string) => readFilter(search, name, fallback),
      [search],
    ),
    setFilter: React.useCallback(
      (name: string, value: string | null) => commit({ [name]: value }, "push"),
      [commit],
    ),
    /** Clears search and every filter, keeping sort and size. */
    reset: React.useCallback(() => {
      const patch: Record<string, string | null> = { q: null };
      for (const name of Object.keys(config.filterDefaults ?? {})) {
        patch[name] = null;
      }
      commit(patch, "push");
    }, [commit, config.filterDefaults]),
  };
}
```

- [ ] **Step 2: Ship gate**

Run: `npm run lint && npm run typecheck`
Expected: both clean. If ESLint's exhaustive-deps rule flags `config` (an object literal at every call site), the fix is to hoist each screen's config to a module-level `const` in Tasks 6–8, which those tasks already do. Do not silence the rule.

- [ ] **Step 3: Commit**

```bash
git add src/lib/list/use-list-params.ts
git commit -m "feat(list): add the useListParams client hook"
```

---

### Task 4: Sortable column headers

**Files:**

- Modify: `src/components/ui/data-table.tsx:99-117` (the `TableHead` function)

**Interfaces:**

- Consumes: nothing from earlier tasks — `ui/` stays app-agnostic, so the sort state is a plain string union declared here.
- Produces: `TableHead` accepting `sortKey?: string`, `sortState?: "asc" | "desc" | null`, `onSort?: (key: string) => void`. Every existing call site keeps working untouched.

No unit test: there is no jsdom or component-test setup in this repo, and adding one is out of scope. Verification is the build plus the manual pass in Task 6.

- [ ] **Step 1: Add the lucide import**

At the top of `src/components/ui/data-table.tsx`, after the `cva` import:

```ts
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
```

- [ ] **Step 2: Replace `TableHead`**

Replace the whole `TableHead` function with:

```tsx
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
```

- [ ] **Step 3: Verify nothing regressed**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: all clean. Every existing `<TableHead>` call passes no `sortKey`, so it takes the unchanged branch.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/data-table.tsx
git commit -m "feat(ui): add opt-in sort controls to TableHead"
```

---

### Task 5: The pagination primitive

**Files:**

- Create: `src/components/ui/pagination.tsx`

**Interfaces:**

- Consumes: `Button` from `./button`, `Select*` from `./select`.
- Produces: `Pagination({ page, pageCount, size, onPageChange, onSizeChange, className }: { page: number; pageCount: number; size: number | "all"; onPageChange: (page: number) => void; onSizeChange: (size: number | "all") => void; className?: string })`

The `PAGE_SIZES` list is duplicated here as a local literal rather than imported from `src/lib/list/`: `ui/` must not import from the app layer (PROJECT-STRUCTURE.md §3). The two lists agreeing is enforced by the `size` prop's type, not by a shared constant.

No unit test, for the same reason as Task 4.

- [ ] **Step 1: Write the component**

Create `src/components/ui/pagination.tsx`:

```tsx
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
```

- [ ] **Step 2: Ship gate**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: all clean. The component has no consumer yet, so `build` only proves it compiles.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/pagination.tsx
git commit -m "feat(ui): add the Pagination primitive"
```

---

### Task 6: Wire `/products`

The smallest of the three screens, so it establishes the wiring pattern that Tasks 7 and 8 repeat.

**Files:**

- Modify: `src/app/(app)/products/_components/ProductTable.tsx` (whole file)

**Interfaces:**

- Consumes: `applyListView`, `byField`, `compareNumber`, `compareText`, `compareRank` from `@/lib/list/apply-list-view`; `useListParams` from `@/lib/list/use-list-params`; `type ListParamsConfig` from `@/lib/list/list-params`; `Pagination` from `@/components/ui/pagination`.
- Produces: nothing consumed by later tasks. Tasks 7 and 8 copy this shape, they do not import from it.

- [ ] **Step 1: Replace the state and filtering block**

In `src/app/(app)/products/_components/ProductTable.tsx`, add to the imports:

```tsx
import {
  applyListView,
  byField,
  compareNumber,
  compareText,
} from "@/lib/list/apply-list-view";
import type { ListParamsConfig } from "@/lib/list/list-params";
import { useListParams } from "@/lib/list/use-list-params";
import { Pagination } from "@/components/ui/pagination";
```

The existing `import type { Product } from "@/lib/mock";` stays as it is.

Then, above the component, add the sort map and config:

```tsx
// Sortable columns for this screen. `Fab pricing` is absent on purpose: it is a
// worst-across-tiers badge, and its rank order is meaningful only as a badge,
// not as a column sequence (design spec §3.3).
type ProductSortKey =
  "name" | "sku" | "vendor" | "assembly_hours" | "tiers" | "updated";

// Every selector annotates its own parameter (`row: Product`). Leaving it to
// inference makes `byField`'s `T` depend on the contextual return type, which
// is fragile enough that a refactor can silently produce `any`.
const SORTS: Record<
  ProductSortKey,
  (dir: "asc" | "desc") => (a: Product, b: Product) => number
> = {
  name: (dir) => byField((row: Product) => row.name, compareText, dir),
  sku: (dir) => byField((row: Product) => row.sku, compareText, dir),
  vendor: (dir) => byField((row: Product) => row.vendor, compareText, dir),
  assembly_hours: (dir) =>
    byField((row: Product) => row.est_labor_hours, compareNumber, dir),
  tiers: (dir) => byField((row: Product) => row.tier_count, compareNumber, dir),
  // `updated_at` is an ISO string, so lexical order IS chronological order.
  updated: (dir) => byField((row: Product) => row.updated_at, compareText, dir),
};

// Hoisted to module scope, not built inline: `useListParams` memoises on it,
// and a fresh object every render would rebuild every callback every render.
const LIST_CONFIG: ListParamsConfig<ProductSortKey> = {
  sortKeys: Object.keys(SORTS) as ProductSortKey[],
  // A rep opens the catalog to look up a known name (spec D5).
  defaultSort: "name",
  defaultDir: "asc",
  filterDefaults: { deactivated: "0" },
};
```

Replace lines 31–50 (the `useState` pair, the `needle`/`rows` block, and `hiddenByToggle`) with:

```tsx
const list = useListParams(LIST_CONFIG);
const { params } = list;
const showDeactivated = list.filter("deactivated", "0") === "1";

const needle = params.q.toLowerCase();
const view = applyListView(products, {
  filter: (product) => {
    const matchesActive = showDeactivated || product.active;
    const matchesQuery =
      needle === "" ||
      product.name.toLowerCase().includes(needle) ||
      product.sku.toLowerCase().includes(needle) ||
      (product.vendor ?? "").toLowerCase().includes(needle);
    return matchesActive && matchesQuery;
  },
  compare: SORTS[params.sort](params.dir),
  page: params.page,
  size: params.size,
});

const rows = view.rows;

// An empty result has two possible causes and the copy has to name the one in
// play, because one of them is invisible: the deactivated toggle is off by
// default (PRD-018 keeps deactivation soft), so a rep searching for a
// deactivated product by name hits a dead end with nothing on screen
// explaining why it isn't there.
const hiddenByToggle = !showDeactivated && products.some((p) => !p.active);
```

- [ ] **Step 2: Rewire the toolbar controls**

The search `Input` (lines 60–66) becomes:

```tsx
<Input
  value={list.query}
  onChange={(event) => list.setQuery(event.target.value)}
  placeholder="Search name, SKU, or vendor"
  aria-label="Search products"
  className="w-80 pl-9"
/>
```

The `Switch` (lines 70–73) becomes:

```tsx
<Switch
  checked={showDeactivated}
  onCheckedChange={(checked) =>
    list.setFilter("deactivated", checked ? "1" : null)
  }
/>
```

The two empty-state buttons change their handlers only:

```tsx
<Button variant="outline" size="sm" onClick={() => list.setQuery("")}>
  Clear search
</Button>
```

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => list.setFilter("deactivated", "1")}
>
  Show deactivated
</Button>
```

Every `needle === ""` / `query.trim()` reference in the empty-state copy becomes `params.q === ""` / `params.q`.

- [ ] **Step 3: Make the headers sortable**

Replace the `<TableRow>` inside `<TableHeader>` with:

```tsx
<TableRow>
  <TableHead
    sortKey="name"
    sortState={list.sortStateFor("name")}
    onSort={(key) => list.toggleSort(key as ProductSortKey)}
  >
    Product
  </TableHead>
  <TableHead
    sortKey="sku"
    sortState={list.sortStateFor("sku")}
    onSort={(key) => list.toggleSort(key as ProductSortKey)}
  >
    SKU
  </TableHead>
  <TableHead
    sortKey="vendor"
    sortState={list.sortStateFor("vendor")}
    onSort={(key) => list.toggleSort(key as ProductSortKey)}
  >
    Vendor
  </TableHead>
  <TableHead
    className="text-right"
    sortKey="assembly_hours"
    sortState={list.sortStateFor("assembly_hours")}
    onSort={(key) => list.toggleSort(key as ProductSortKey)}
  >
    Assembly hrs
  </TableHead>
  <TableHead
    className="text-right"
    sortKey="tiers"
    sortState={list.sortStateFor("tiers")}
    onSort={(key) => list.toggleSort(key as ProductSortKey)}
  >
    Tiers
  </TableHead>
  <TableHead>Fab pricing</TableHead>
  <TableHead
    sortKey="updated"
    sortState={list.sortStateFor("updated")}
    onSort={(key) => list.toggleSort(key as ProductSortKey)}
  >
    Updated
  </TableHead>
</TableRow>
```

- [ ] **Step 4: Add the pager and update the count line**

First add the two row-number bindings just below the `hiddenByToggle` line, above the `return`. They are hoisted rather than inlined into the JSX because the "all" branch makes the expression unreadable in a template literal:

```tsx
const firstRow = params.size === "all" ? 1 : (view.page - 1) * params.size + 1;
const lastRow = firstRow + rows.length - 1;
```

Then replace the closing `role="status"` paragraph with:

```tsx
{
  view.total > 0 ? (
    <Pagination
      page={view.page}
      pageCount={view.pageCount}
      size={params.size}
      onPageChange={list.setPage}
      onSizeChange={list.setSize}
    />
  ) : null;
}

{
  /* `role="status"` (polite + atomic) is what makes the filter audible:
          search, the toggle, a sort click and a page turn all rewrite the table
          with no page navigation, so without a live region a screen-reader user
          gets no confirmation the list changed, or that it went empty (WCAG 2.2
          4.1.3). It is also why the pager carries no live region of its own. */
}
<p role="status" className="text-xs text-muted-foreground">
  {view.total === 0
    ? `Showing 0 of ${products.length} products.`
    : `Showing ${firstRow} to ${lastRow} of ${view.total} products.`}
</p>;
```

The pager renders only when there are rows: "Page 1 of 1" above an empty state is chrome with nothing to control. The size selector goes with it, which is a real if minor cost — a filter that empties the list also hides the control that would widen it. The empty state's own "Clear search" button is the way back.

- [ ] **Step 5: Verify the route still builds**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: all clean. `/products` is expected to move from `○` to `ƒ` in the build output; that is spec §4.3 and is not a regression.

If the build fails with a message about `useSearchParams()` needing a Suspense boundary, add `export const dynamic = "force-dynamic";` at the top of `src/app/(app)/products/(list)/page.tsx` and re-run. Do not wrap the table in a `<Suspense>` in the page — the `(list)/loading.tsx` beside it is already the boundary for that segment.

- [ ] **Step 6: Manual verification**

Run: `npm run dev` (if port 3000 is already serving this directory, use the running server rather than starting a second one).

Check each of these at `http://localhost:3000/products`:

1. Default view URL is exactly `/products` — no params.
2. Clicking `Vendor` gives `?sort=vendor`; clicking again gives `?sort=vendor&dir=desc`. Rows with "No vendor" stay at the bottom in both.
3. `aria-sort` is on exactly one `<th>` (inspect the DOM).
4. Typing in search updates the URL once, ~250 ms after the last keystroke, and Back does not step through each letter.
5. Toggling "Show deactivated" gives `?deactivated=1`; toggling back removes it.
6. Set rows per page to 25, page forward, then change the search term — the page resets to 1.
7. Hand-edit the URL to `?sort=nonsense&dir=sideways&page=abc&size=7` — the screen renders the default view and does not error.
8. Reload on `?sort=vendor&dir=desc&page=2` — the same view comes back.
9. At 768px wide the toolbar and the pager both stay inside the viewport.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/products/_components/ProductTable.tsx"
git commit -m "feat(products): sort, paginate, and move filters into the URL"
```

---

### Task 7: Wire `/library`

Same shape as Task 6, with two filters instead of one and a ranked freshness column.

**Files:**

- Modify: `src/app/(app)/library/_components/ComponentTable.tsx` (whole file)

**Interfaces:**

- Consumes: the same modules as Task 6, plus `compareRank`.
- Produces: nothing.

- [ ] **Step 1: Add the sort map and config**

Add to the imports in `src/app/(app)/library/_components/ComponentTable.tsx`:

```tsx
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
```

Above the component, after the existing `ENVIRONMENT` map, add:

```tsx
// `Environment` is absent from the sortable keys on purpose: Any/Indoor/Outdoor
// is a classification, not a scale, so any order it produces is arbitrary
// (design spec §3.3).
type ComponentSortKey =
  | "name"
  | "category"
  | "vendor"
  | "cost"
  | "labor_hours"
  | "quoted"
  | "freshness";

/** PRD-009's three states, in severity order — never alphabetical. */
const FRESHNESS_ORDER = ["current", "aging", "requote"] as const;

// Category sorts by display name, which needs the id→name map the component
// already builds. Passing it in keeps every comparator a pure function of its
// row rather than closing over component state.
function sortsFor(
  categoryName: Map<string, string>,
): Record<
  ComponentSortKey,
  (dir: "asc" | "desc") => (a: LibraryComponent, b: LibraryComponent) => number
> {
  return {
    name: (dir) =>
      byField((row: LibraryComponent) => row.name, compareText, dir),
    category: (dir) =>
      byField(
        (row: LibraryComponent) => categoryName.get(row.category_id),
        compareText,
        dir,
      ),
    vendor: (dir) =>
      byField((row: LibraryComponent) => row.vendor, compareText, dir),
    cost: (dir) =>
      byField((row: LibraryComponent) => row.cost, compareNumber, dir),
    labor_hours: (dir) =>
      byField(
        (row: LibraryComponent) => row.default_labor_hours,
        compareNumber,
        dir,
      ),
    // `quoted_date` is an ISO date string, so lexical order is chronological.
    quoted: (dir) =>
      byField((row: LibraryComponent) => row.quoted_date, compareText, dir),
    freshness: (dir) =>
      byField(
        (row: LibraryComponent) => row.freshness,
        compareRank(FRESHNESS_ORDER),
        dir,
      ),
  };
}

const SORT_KEYS: ComponentSortKey[] = [
  "name",
  "category",
  "vendor",
  "cost",
  "labor_hours",
  "quoted",
  "freshness",
];

const LIST_CONFIG: ListParamsConfig<ComponentSortKey> = {
  sortKeys: SORT_KEYS,
  defaultSort: "name",
  defaultDir: "asc",
  filterDefaults: { category: "all", deactivated: "0" },
};
```

- [ ] **Step 2: Replace the state and filtering block**

Replace lines 51–71 (the three `useState` calls through the end of the `rows` filter) with:

```tsx
const list = useListParams(LIST_CONFIG);
const { params } = list;
const categoryId = list.filter("category", "all");
const showDeactivated = list.filter("deactivated", "0") === "1";

const categoryName = React.useMemo(
  () => new Map(categories.map((category) => [category.id, category.name])),
  [categories],
);

const compare = React.useMemo(
  () => sortsFor(categoryName)[params.sort](params.dir),
  [categoryName, params.dir, params.sort],
);

const needle = params.q.toLowerCase();
const view = applyListView(components, {
  filter: (component) => {
    const matchesCategory =
      categoryId === "all" || component.category_id === categoryId;
    const matchesActive = showDeactivated || component.active;
    const matchesQuery =
      needle === "" ||
      component.name.toLowerCase().includes(needle) ||
      component.sku.toLowerCase().includes(needle) ||
      (component.vendor ?? "").toLowerCase().includes(needle);
    return matchesCategory && matchesActive && matchesQuery;
  },
  compare,
  page: params.page,
  size: params.size,
});

const rows = view.rows;
const firstRow = params.size === "all" ? 1 : (view.page - 1) * params.size + 1;
const lastRow = firstRow + rows.length - 1;
```

An unknown `category` id in the URL matches no row and yields the empty state. That is correct and deliberate: a category can be deleted between one person sharing a link and another opening it, and silently widening the filter to "all" would show a list that does not match the URL.

- [ ] **Step 3: Rewire the toolbar controls**

Search `Input`:

```tsx
<Input
  value={list.query}
  onChange={(event) => list.setQuery(event.target.value)}
  placeholder="Search name, SKU, or vendor"
  aria-label="Search components"
  className="pl-9"
/>
```

Category `Select`:

```tsx
          <Select
            value={categoryId}
            onValueChange={(next) =>
              list.setFilter("category", next === "all" ? null : next)
            }
          >
```

Deactivated `Switch`:

```tsx
<Switch
  checked={showDeactivated}
  onCheckedChange={(checked) =>
    list.setFilter("deactivated", checked ? "1" : null)
  }
/>
```

- [ ] **Step 4: Make the headers sortable**

Replace the header `<TableRow>` with (repeating the same `sortKey` / `sortState` / `onSort` triple per column, exactly as in Task 6):

```tsx
<TableRow>
  <TableHead
    sortKey="name"
    sortState={list.sortStateFor("name")}
    onSort={(key) => list.toggleSort(key as ComponentSortKey)}
  >
    Component
  </TableHead>
  <TableHead
    sortKey="category"
    sortState={list.sortStateFor("category")}
    onSort={(key) => list.toggleSort(key as ComponentSortKey)}
  >
    Category
  </TableHead>
  <TableHead
    sortKey="vendor"
    sortState={list.sortStateFor("vendor")}
    onSort={(key) => list.toggleSort(key as ComponentSortKey)}
  >
    Vendor
  </TableHead>
  <TableHead>Environment</TableHead>
  <TableHead
    className="text-right"
    sortKey="cost"
    sortState={list.sortStateFor("cost")}
    onSort={(key) => list.toggleSort(key as ComponentSortKey)}
  >
    Cost
  </TableHead>
  <TableHead
    className="text-right"
    sortKey="labor_hours"
    sortState={list.sortStateFor("labor_hours")}
    onSort={(key) => list.toggleSort(key as ComponentSortKey)}
  >
    Labor hrs
  </TableHead>
  <TableHead
    sortKey="quoted"
    sortState={list.sortStateFor("quoted")}
    onSort={(key) => list.toggleSort(key as ComponentSortKey)}
  >
    Quoted
  </TableHead>
  <TableHead
    sortKey="freshness"
    sortState={list.sortStateFor("freshness")}
    onSort={(key) => list.toggleSort(key as ComponentSortKey)}
  >
    Freshness
  </TableHead>
</TableRow>
```

- [ ] **Step 5: Add the pager and update the count line**

Replace the closing `role="status"` paragraph with:

```tsx
{
  view.total > 0 ? (
    <Pagination
      page={view.page}
      pageCount={view.pageCount}
      size={params.size}
      onPageChange={list.setPage}
      onSizeChange={list.setSize}
    />
  ) : null;
}

{
  /* `role="status"` (polite + atomic) is what makes the filters audible:
          search, the category select, the toggle, a sort click and a page turn
          all rewrite the table with no page navigation, so without a live
          region a screen-reader user gets no confirmation the list changed, or
          that it went empty (WCAG 2.2 4.1.3). Matches ProductTable. */
}
<p role="status" className="text-xs text-muted-foreground">
  {view.total === 0
    ? `Showing 0 of ${components.length} components.`
    : `Showing ${firstRow} to ${lastRow} of ${view.total} components.`}
</p>;
```

- [ ] **Step 6: Verify**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: all clean; `/library` moves to `ƒ`.

Then at `http://localhost:3000/library`, in addition to the nine checks from Task 6 Step 6:

- Sorting by `Freshness` ascending gives Current, then Aging, then Re-quote — never alphabetical.
- Sorting by `Category` orders by the displayed category name, not by id.
- `Environment` has no sort button and no `aria-sort`.
- Selecting a category gives `?category=<id>`; choosing "All categories" removes the param entirely.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/library/_components/ComponentTable.tsx"
git commit -m "feat(library): sort, paginate, and move filters into the URL"
```

---

### Task 8: Wire `/quotes`

Nine sortable columns, a status filter that is a tab row rather than a select, and the lifecycle-ordered status sort.

**Files:**

- Modify: `src/app/(app)/quotes/_components/QuoteTable.tsx` (whole file)

**Interfaces:**

- Consumes: the same modules as Task 7, plus `QUOTE_STATUS_ORDER` which the file already imports.
- Produces: nothing.

- [ ] **Step 1: Add the sort map and config**

Add to the imports:

```tsx
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
```

Above the component, after the `StatusFilter` type, add:

```tsx
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
  (dir: "asc" | "desc") => (a: Quote, b: Quote) => number
> = {
  quote: (dir) => byField((row: Quote) => row.quote_number, compareText, dir),
  customer: (dir) =>
    byField((row: Quote) => row.customer_name, compareText, dir),
  product: (dir) => byField((row: Quote) => row.product_name, compareText, dir),
  tier: (dir) => byField((row: Quote) => row.qty_tier, compareNumber, dir),
  // Lifecycle order, reusing the same constant the tab row is built from, so
  // the two can never disagree. Alphabetical would give approved, draft,
  // review, sent — which conveys nothing about where a quote sits.
  status: (dir) =>
    byField((row: Quote) => row.status, compareRank(QUOTE_STATUS_ORDER), dir),
  price: (dir) =>
    byField((row: Quote) => row.final_price_each, compareNumber, dir),
  gp: (dir) => byField((row: Quote) => row.gp_percent, compareNumber, dir),
  owner: (dir) => byField((row: Quote) => row.owner_name, compareText, dir),
  // `updated_at` is an ISO timestamp, so lexical order is chronological.
  updated: (dir) => byField((row: Quote) => row.updated_at, compareText, dir),
};

const LIST_CONFIG: ListParamsConfig<QuoteSortKey> = {
  sortKeys: Object.keys(SORTS) as QuoteSortKey[],
  // A rep opens Quotes to resume yesterday's work, so the most recently touched
  // quote is the one they want on top (spec D5).
  defaultSort: "updated",
  defaultDir: "desc",
  filterDefaults: { status: "all" },
};
```

- [ ] **Step 2: Replace the state and filtering block**

Replace lines 45–57 (both `useState` calls through the end of the `rows` filter) with:

```tsx
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
const firstRow = params.size === "all" ? 1 : (view.page - 1) * params.size + 1;
const lastRow = firstRow + rows.length - 1;
```

- [ ] **Step 3: Rewire the toolbar controls**

`Tabs`:

```tsx
        <Tabs
          value={status}
          onValueChange={(next) =>
            list.setFilter("status", next === "all" ? null : next)
          }
        >
```

Search `Input`:

```tsx
<Input
  value={list.query}
  onChange={(event) => list.setQuery(event.target.value)}
  placeholder="Search quote, customer, or product"
  aria-label="Search quotes"
  className="w-80 pl-9"
/>
```

Empty-state buttons:

```tsx
<Button variant="outline" size="sm" onClick={() => list.setQuery("")}>
  Clear search
</Button>
```

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => list.setFilter("status", null)}
>
  Show all statuses
</Button>
```

Every `needle === ""` / `query.trim()` in the empty-state copy becomes `params.q === ""` / `params.q`.

- [ ] **Step 4: Make the headers sortable**

Replace the header `<TableRow>` with all nine columns carrying the triple:

```tsx
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
```

- [ ] **Step 5: Add the pager and update the count line**

Replace the closing `role="status"` paragraph with:

```tsx
{
  view.total > 0 ? (
    <Pagination
      page={view.page}
      pageCount={view.pageCount}
      size={params.size}
      onPageChange={list.setPage}
      onSizeChange={list.setSize}
    />
  ) : null;
}

{
  /* `role="status"` (polite + atomic) is what makes the filters audible:
          the status tabs, the search box, a sort click and a page turn all
          rewrite the table with no page navigation, so without a live region a
          screen-reader user gets no confirmation the list changed, or that it
          went empty (WCAG 2.2 4.1.3). Matches ProductTable and
          ComponentTable. */
}
<p role="status" className="text-xs text-muted-foreground">
  {view.total === 0
    ? `Showing 0 of ${quotes.length} quotes.`
    : `Showing ${firstRow} to ${lastRow} of ${view.total} quotes.`}
</p>;
```

- [ ] **Step 6: Verify**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: all clean; `/quotes` moves to `ƒ`.

Then at `http://localhost:3000/quotes`, in addition to the nine checks from Task 6 Step 6:

- The default view is Updated descending with **no** params in the URL, even though that is not `name`/`asc` — `sort` and `dir` are omitted because they equal _this screen's_ defaults.
- Sorting by `Status` ascending gives Draft, Review, Approved, Sent.
- Clicking a status tab gives `?status=pending_approval`; clicking `All` removes the param.
- `?status=nonsense` shows every quote with the `All` tab selected, and does not error.
- The below-margin-floor warning icon and its tooltip still work on a sorted, paged view.

- [ ] **Step 7: Full-suite check**

Run: `npm run test && npm run lint && npm run typecheck && npm run build`
Expected: all four clean.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/quotes/_components/QuoteTable.tsx"
git commit -m "feat(quotes): sort, paginate, and move filters into the URL"
```

---

### Task 9: Design audit

**Files:** none modified. This task only runs checks and surfaces one decision.

- [ ] **Step 1: Run the deterministic design check**

Run: `npx impeccable detect src/`
Expected: exit 0, zero findings. The baseline is clean, so **any** new finding is real — triage it, do not suppress it. If one appears, fix the code; a suppression needs its own approval and a `$comment` entry in `.impeccable/config.json`.

- [ ] **Step 2: Check rendered contrast on the three routes**

Static scanning cannot resolve semantic tokens, so the WCAG AA floor is only checked against a rendered page. With `npm run dev` running:

```bash
npx impeccable detect http://localhost:3000/products
npx impeccable detect http://localhost:3000/library
npx impeccable detect http://localhost:3000/quotes
```

Expected: exit 0 on each. `em-dash-overuse` on `/quotes` is known, deliberate, advisory-only noise — it does not affect the exit code and must not be suppressed.

- [ ] **Step 3: Raise the spec-retirement question — do not decide it here**

CLAUDE.md makes the design spec transient: it is deleted once its content lands in whatever it feeds. Most of it has landed — §3 through §8 are now code and comments. Two sections have not:

- **§9, rejected alternatives.** Three decisions with reasons, recorded so they are not reopened from memory. No code carries them.
- **§10, migration to server-side querying.** Instructions for work that has not started.

Deleting the file loses both. Keeping it means a "transient" doc outlives its trigger, which is exactly the drift CLAUDE.md's rule exists to prevent.

**Recommendation:** keep the spec until Supabase reads land, and change its CLAUDE.md bullet to say so. **This is a source-of-truth doc edit — stop and get explicit approval.** Do not delete the spec or touch CLAUDE.md as part of executing this plan.

---

## Coverage against the spec

| Spec section                  | Task                       |
| ----------------------------- | -------------------------- |
| §3.1 pure function            | 1                          |
| §3.2 comparators, nulls, ties | 1, 6–8                     |
| §3.3 non-sortable columns     | 6, 7                       |
| §4 URL contract, defaults     | 2, 6–8                     |
| §4.1 push vs replace          | 3                          |
| §4.2 page reset               | 2                          |
| §4.3 dynamic routes           | 6–8                        |
| §5.1 Pagination               | 5                          |
| §5.2 TableHead sort props     | 4                          |
| §6 error handling             | 1, 2                       |
| §7 accessibility              | 4, 5, 6–8                  |
| §8 testing, `passWithNoTests` | 1, 2                       |
| §10 migration seam            | 1 (documented, no work)    |
| §11 out of scope              | not implemented, by design |
