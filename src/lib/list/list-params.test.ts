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
