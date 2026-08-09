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
    // The expected order is also the localeCompare order: codepoint order
    // ("Alpha", "Charlie", "Delta", "bravo") puts every lowercase name last,
    // so this fixture fails if `compareText` ever stops using localeCompare.
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
