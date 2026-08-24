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
  const isExplicitSortValid = config.sortKeys.includes(rawSort as K);
  const sort = isExplicitSortValid ? (rawSort as K) : config.defaultSort;

  const rawDir = params.get("dir") ?? "";
  // Direction belongs to the sort in effect. If the URL provides an invalid sort
  // key, we discard its direction. If the URL omits the sort key (rawSort === ""),
  // the default sort is in effect, so we honor the provided direction.
  const isSortValid = rawSort === "" || isExplicitSortValid;
  const dir: SortDir =
    isSortValid && (rawDir === "asc" || rawDir === "desc")
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

  // Built through URLSearchParams rather than joined by hand: `q` is free text,
  // and hand-concatenation emits its value raw. A search for "Smith & Sons"
  // then produces `q=Smith & Sons`, which parses back as q="Smith " plus a
  // bogus empty param -- the term is silently truncated at the ampersand. `#`
  // is worse: it starts the URL fragment, so everything after it leaves the
  // query string entirely. `toString()` percent-encodes both.
  const out = new URLSearchParams();
  for (const key of order) {
    const val = merged.get(key);
    if (val !== undefined && val !== defaults[key]) out.set(key, val);
  }
  return out.toString();
}
