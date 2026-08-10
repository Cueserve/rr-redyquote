# List Sort and Pagination — Design Spec

**Owner:** Viral Parikh
**Date:** 2026-08-09
**Status:** Approved (design only; no implementation in this change)
**Scope:** The three list screens — `/quotes`, `/products`, `/library`

---

## 1. Purpose

Add column sorting and pagination to the three list screens, and move the filter state
those screens already carry out of component state and into the URL.

Neither sorting nor pagination appears in [PRD.md](../../PRD.md). This is net-new scope,
which is why it went through brainstorming before design.

### What is wrong today

None of the three lists can be ordered. Rows render in fixture order, and filtering
narrows the set without giving the remainder a meaningful sequence. Separately, all three
tables hold their filters in `useState`, so opening a row and returning clears the search
box and every filter — a live annoyance, not a hypothetical one.

### The scale this is designed against

[PRD.md](../../PRD.md) NFR-001 fixes REDYREF's real size at "a handful of concurrent users,
low hundreds of products/components/quotes." That number was pressure-tested against
pagination twice during brainstorming and the decision was still to page every list
uniformly. The reasoning is recorded in §9 so it is not relitigated from memory.

One asymmetry is worth stating because it survives the decision: products and components
are catalog data, bounded and pruned by deactivation, while **quotes accumulate without
bound.** Quotes is the list that will actually exercise pagination.

## 2. Decisions

| #   | Decision                                                                        | Rationale                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | View state lives in **URL query params**                                        | Survives back and refresh, is pasteable, and is the same shape the eventual Supabase query takes — `?sort=cost&dir=desc&page=2` becomes `.order('cost', {ascending:false}).range(50,99)` with no restructuring |
| D2  | Pagination is **always on**, uniform across all three lists                     | One code path, one design, no chrome appearing the day the data grows. Accepted cost: a "Page 1 of 1" control under a short list, and Ctrl+F reaching only the current page                                    |
| D3  | Page size **50 by default, with a selector** offering 25 / 50 / 100 / All       | `All` is what returns Ctrl+F to anyone who wants it, which was the only remaining objection to D2                                                                                                              |
| D4  | Sorting is **clickable column headers, single column at a time**                | The sort key is always a visible column, so a separate sort `Select` reinvents a standard affordance — which the product register names as a failure mode                                                      |
| D5  | Defaults differ per screen: quotes by **Updated desc**, catalog by **name asc** | A rep opens Quotes to resume yesterday's work and opens the catalog to look up a known name. Different jobs, different orders                                                                                  |
| D6  | The sort, filter, and slice live in **one pure function** in `src/lib/list/`    | Testable with no React, and the params object it consumes is the contract that migrates to the server                                                                                                          |

## 3. Architecture

New module `src/lib/list/`, a sibling of `src/lib/validation/` and shaped the same way.
There is no `src/hooks/` in this repo and this spec does not create one.

```text
src/lib/list/
  apply-list-view.ts        pure, generic, no React and no routing
  apply-list-view.test.ts   co-located per PROJECT-STRUCTURE.md §1
  use-list-params.ts        the only thing that touches useSearchParams and the router
```

### 3.1 The pure function

```ts
function applyListView<T>(
  rows: T[],
  options: {
    filter?: (row: T) => boolean;
    compare: (a: T, b: T) => number;
    page: number;
    size: number | "all";
  },
): {
  rows: T[]; // the current page only
  total: number; // rows after filtering, before paging
  pageCount: number;
  page: number; // clamped to [1, pageCount]
};
```

Filter, then sort, then slice — in that order. Sorting before filtering wastes work and
paging before sorting is simply wrong.

### 3.2 Comparators belong to the screen

Each screen declares its own sortable columns, because each screen owns its own row type:

```ts
const SORTS: Record<
  string,
  (a: LibraryComponent, b: LibraryComponent) => number
>;
```

Three rules that are easy to get wrong and are therefore part of the spec, not the
implementer's discretion:

- **Status sorts by lifecycle order, never alphabetically.** Draft → Review →
  Approved → Sent. Alphabetical yields _approved, draft, review, sent_, which
  conveys nothing about where a quote sits.
- **Freshness sorts the same way:** Current → Aging → Re-quote.
- **Nulls sort last in both directions.** `vendor` is nullable; a naive ascending sort
  puts every "No vendor" row at the top, which is the least useful thing it could do.
- Text comparison uses `localeCompare`; numeric columns compare numerically, never as
  strings.
- The comparator must be **stable for ties** so that two rows with equal cost do not swap
  places between renders.

### 3.3 Not every column is sortable

`Fab pricing` on `/products` and `Environment` on `/library` are badge summaries with no
natural order. They get no sort control. A column whose sort produces an arbitrary
sequence is worse than one that plainly cannot be sorted.

## 4. URL contract

Shared params on every list: `q`, `sort`, `dir`, `page`, `size`.

Screen filters keep their existing names and move from `useState` into the URL unchanged
in meaning:

| Screen      | Filter params today (in `useState`)           |
| ----------- | --------------------------------------------- |
| `/quotes`   | `status` (the tab row)                        |
| `/products` | `deactivated` (the "Show deactivated" switch) |
| `/library`  | `category`, `deactivated`                     |

**A param equal to its default is removed from the URL.** `/library` is therefore the
canonical URL for the default view, and only meaningful state is ever visible. This is
most of the answer to the "URLs get noisy" objection against D1.

`sort` values are the screen's own sort keys, and each screen's `SORTS` map (§3.2) is the
authoritative list of what is accepted. Every other value normalizes per §6.

| Screen      | Sortable keys                                                                       | Default `sort` | Default `dir` |
| ----------- | ----------------------------------------------------------------------------------- | -------------- | ------------- |
| `/quotes`   | `quote`, `customer`, `product`, `tier`, `status`, `price`, `gp`, `owner`, `updated` | `updated`      | `desc`        |
| `/products` | `name`, `sku`, `vendor`, `assembly_hours`, `tiers`, `updated`                       | `name`         | `asc`         |
| `/library`  | `name`, `category`, `vendor`, `cost`, `labor_hours`, `quoted`, `freshness`          | `name`         | `asc`         |

`size` defaults to `50`, `page` to `1`. `Fab pricing` (`/products`) and `Environment`
(`/library`) are deliberately absent from the sortable keys — see §3.3.

### 4.1 Router behavior

- **Search box:** 250 ms debounce, then `router.replace`.
- **Sort, filter, page, size:** `router.push`.

The split is deliberate. A keystroke is not something anyone wants to undo with the back
button, and one search term should not leave twelve history entries. A sort click or a
page turn _is_ a discrete action worth undoing.

### 4.2 Page reset

**Any change to search, filter, sort, or size resets `page` to 1.** Without this rule a
user filters down to three results while sitting on page 4 and is shown a blank table.

### 4.3 Route rendering

Reading the URL from the client — `useSearchParams()` inside the table component —
does **not** make these routes dynamic. It makes Next bail the whole page segment out
to client rendering: the route still reports **`○`**, but the only thing prerendered is
`loading.tsx`, so the server response carries no heading, no toolbar and no table. Only
the app shell from `layout.tsx` survives.

This was verified against `next start`, not inferred: `/products` returns
`BAILOUT_TO_CLIENT_SIDE_RENDERING` and zero `<table>` elements, while the unwired
`/quotes` and `/library` each return one. Two candidate fixes were tried and **both
failed** — `export const dynamic = "force-dynamic"` (route becomes `ƒ`, content still
bails) and deleting `(list)/loading.tsx` (still bails).

**Accepted, with the reasoning stated so it is not rediscovered.** RedyQuote is an
internal tool behind auth, ≥768px only (NFR-008), a handful of concurrent users
(NFR-001), and has no SEO surface. The cost is a loading shell before first paint on
three screens. The fix — moving the read into each `page.tsx` — is §9's rejected
alternative and §10's migration target, and it stays deferred to when Supabase reads
land, because it has to happen then anyway.

It does **not** interact with the `(list)` route groups or the 404-under-200 rule
documented in [PROJECT-STRUCTURE.md](../../PROJECT-STRUCTURE.md) §4 — that rule is about
detail (`[id]`) routes calling `notFound()`, and no detail route is touched here.

## 5. Components

### 5.1 `src/components/ui/pagination.tsx` — new

Presentational only. It receives `page`, `pageCount`, `total`, `size`, `onPageChange` and
`onSizeChange`, and **never reads the URL**. [data-table.tsx](../../../src/components/ui/data-table.tsx)
is presentational by charter and `ui/` must stay app-agnostic
([PROJECT-STRUCTURE.md](../../PROJECT-STRUCTURE.md) §3); the routing stays in the app layer.

**First / Prev / Next / Last, with no page-number list.** At 2000 quotes and size 25 that
is 80 pages: Prev/Next alone means 79 clicks to reach the end, and a numbered list needs
ellipsis-truncation logic that is pure bug surface for no gain at this scale. Four buttons
plus "Page 3 of 7" covers it.

### 5.2 `TableHead` gains sort props

`sortKey`, `sortState` (`"asc" | "desc" | null`), and `onSort`. It renders a real
`<button>` inside the `<th>` and sets `aria-sort` on the `<th>` — `ascending`,
`descending`, or absent, on exactly one column at a time.

A muted `ArrowUpDown` marks a sortable-but-inactive column so the affordance is
discoverable; a directional chevron marks the active one.

This is an additive change to an existing primitive, consistent with the `editable`
variant precedent in [input.tsx](../../../src/components/ui/input.tsx). It does not turn
`data-table.tsx` into a column-def abstraction, which its own header comment rules out.

## 6. Error handling

**Rule: never throw on a bad param. Normalize silently.** A list route that 500s because
someone truncated a URL is a worse outcome than one that shows the default view.

| Bad input                           | Behavior                                  |
| ----------------------------------- | ----------------------------------------- |
| Unknown `sort` key                  | Fall back to the screen's default sort    |
| Invalid `dir`                       | Fall back to the default sort's direction |
| `page` non-numeric or `< 1`         | 1                                         |
| `page` greater than `pageCount`     | Clamped to `pageCount`                    |
| `size` outside `{25, 50, 100, all}` | 50                                        |

Clamping `page` is also why "page beyond range" needs no empty state: it cannot be
reached.

## 7. Accessibility

The `role="status"` line all three tables already carry becomes the announcement channel.
It changes from "Showing 22 of 22 components." to "Showing 1 to 50 of 312 components.", so
a sort click or a page turn is announced without adding a second live region.

- `aria-sort` on exactly one `<th>` at a time.
- Sort controls are real `<button>`s: focusable, Enter/Space activated.
- Pagination buttons are disabled at the ends and carry real labels ("Next page"), not
  icon-only ambiguity.
- Nothing changes for the table's scroll container, which is already a focusable, labelled
  `role="region"`.
- NFR-008 still applies: the control row must be usable at 768px, and the table may
  continue to scroll horizontally inside its own container.

## 8. Testing

`apply-list-view.test.ts` is **the first real test in this repo**, so `passWithNoTests`
comes out of [vitest.config.ts](../../../vitest.config.ts) in the same change — which is
what the comment in that file already instructs.

Cases:

- empty input
- a single page
- a row count that is an exact multiple of `size`
- `size: "all"`
- `page` clamping, both below 1 and beyond `pageCount`
- nulls-last ordering in both directions
- stable ordering for tied values
- lifecycle-order status sort and Current/Aging/Re-quote freshness sort

Playwright end-to-end coverage stays out of scope (tracked separately as the e2e setup
work).

## 9. Rejected alternatives

Recorded so they are not reopened from memory.

**Pagination only above a row threshold.** Controls would appear once a filtered set
exceeded ~100 rows, leaving today's 7-row and 22-row lists untouched and preserving Ctrl+F
on short lists. Rejected in favour of D2's uniformity: one code path, one design, and no
layout change the day the data grows.

**Pagination on `/quotes` only.** Matches how the data actually grows — quotes accumulate,
catalog data does not — and adds no dead chrome. Rejected because three list screens with
two behaviours is harder to explain than one uniform rule.

**Server Components read `searchParams` and pass one page of rows down.** This is the
migration target, not the current design. Each `page.tsx` would sort and slice server-side,
making wiring a swap of the data source and nothing else. Deferred because it is a real
refactor of three working screens for a benefit that only lands once Supabase reads exist,
and because it splits each screen's logic across a server page and a client toolbar.
See §10.

**A column-def abstraction in `data-table.tsx`.** Rejected: it contradicts that file's
explicit charter, and the three tables have genuinely divergent cells — badge groups,
two-line name cells, derived freshness. A column definition rich enough for all three
stops being simpler than the JSX it replaces.

## 10. Migration to server-side querying

The params object is the seam. When Supabase reads land:

1. `page.tsx` reads `searchParams` instead of the client reading `useSearchParams()`.
2. `filter` / `compare` / `page` / `size` become `.eq()` / `.ilike()` / `.order()` /
   `.range()` on the query builder.
3. `applyListView` is either deleted or retained purely for its tests.
4. The URL contract in §4 does not change, so no bookmark or shared link breaks.

Nothing in this design has to be undone to get there.

## 11. Out of scope

- Multi-column sort.
- Column visibility or reordering.
- Saved views and presets.
- Any server-side querying (see §10).
- URL state on the quote builder or the settings screens.
