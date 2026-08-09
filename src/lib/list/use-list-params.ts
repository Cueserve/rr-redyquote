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
  //
  // `committed` is state, not a ref: this is React's actual documented
  // "adjust state during render" pattern for resyncing from a prop/derived
  // value (react.dev/reference/react/useState#storing-information-from-previous-renders).
  // A ref read/written in the render body — the brief's original shape — trips
  // `react-hooks/refs` (eslint-plugin-react-hooks 7), which forbids touching
  // `ref.current` during render. State does the identical guard job without
  // that violation.
  const [draft, setDraft] = React.useState(params.q);
  const [committed, setCommitted] = React.useState(params.q);
  if (committed !== params.q) {
    setCommitted(params.q);
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
        setCommitted(next.trim());
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
      for (const name of Object.keys(config.filterDefaults)) {
        patch[name] = null;
      }
      commit(patch, "push");
    }, [commit, config.filterDefaults]),
  };
}
