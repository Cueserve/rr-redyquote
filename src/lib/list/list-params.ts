import type { PageSize, SortDir } from "./apply-list-view";

const SUPPORTED_SIZES: ReadonlyArray<PageSize> = [25, 50, 100, "all"];
const DEFAULT_SIZE = 50;

export interface ListParamsConfig<K extends string> {
  sortKeys: readonly K[];
  defaultSort: K;
  defaultDir: SortDir;
  filterDefaults: Record<string, string>;
}

export interface ListParams<K extends string> {
  q: string;
  sort: K;
  dir: SortDir;
  page: number;
  size: PageSize;
}

export function readListParams<K extends string>(
  params: URLSearchParams,
  config: ListParamsConfig<K>,
): ListParams<K> {
  const q = (params.get("q") ?? "").trim();

  const rawSort = params.get("sort") ?? "";
  const validSort = config.sortKeys.includes(rawSort as K);
  const sort = validSort ? (rawSort as K) : config.defaultSort;

  const rawDir = params.get("dir") ?? "";
  // Direction belongs to the sort in effect; an invalid sort key discards its dir.
  const dir: SortDir =
    validSort && (rawDir === "asc" || rawDir === "desc")
      ? rawDir
      : config.defaultDir;

  const rawPage = parseInt(params.get("page") ?? "", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  const rawSize = params.get("size") ?? "";
  const parsedSize: PageSize = rawSize === "all" ? "all" : Number(rawSize);
  const size: PageSize = (SUPPORTED_SIZES as ReadonlyArray<unknown>).includes(
    parsedSize,
  )
    ? parsedSize
    : DEFAULT_SIZE;

  return { q, sort, dir, page, size };
}

export function readFilter(
  params: URLSearchParams,
  key: string,
  fallback: string,
): string {
  return params.get(key) ?? fallback;
}

const CANONICAL_ORDER = ["q", "sort", "dir", "size"] as const;

export function buildListSearch<K extends string>(
  current: URLSearchParams,
  patch: Record<string, string | number | null>,
  config: ListParamsConfig<K>,
): string {
  // Any non-page key changing resets the user back to page 1.
  const resetsPage = Object.keys(patch).some((k) => k !== "page");

  const merged = new Map<string, string>();
  for (const [k, v] of current.entries()) {
    merged.set(k, v);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) {
      merged.delete(k);
    } else {
      merged.set(k, String(v));
    }
  }
  if (resetsPage) {
    merged.set("page", "1");
  }

  const defaults: Record<string, string> = {
    q: "",
    sort: config.defaultSort,
    dir: config.defaultDir,
    page: "1",
    size: String(DEFAULT_SIZE),
    ...config.filterDefaults,
  };

  const order = [
    ...CANONICAL_ORDER,
    ...Object.keys(config.filterDefaults),
    "page",
  ];

  return order
    .filter((key) => {
      const val = merged.get(key);
      return val !== undefined && val !== defaults[key];
    })
    .map((key) => `${key}=${merged.get(key)}`)
    .join("&");
}
