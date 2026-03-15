"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";
import { useCallback, useDeferredValue, useMemo } from "react";
import { fetchPublicSearch } from "../lib/api";

const searchParamsParsers = {
  q: parseAsString.withDefault(""),
  dataset: parseAsString,
};

const RESULTS_PER_PAGE = 20;

export function usePublicSearch() {
  const [params, setParams] = useQueryStates(searchParamsParsers);
  const deferredQuery = useDeferredValue(params.q);

  const hasQuery = deferredQuery.trim().length > 0;

  const infiniteQuery = useInfiniteQuery({
    queryKey: ["public-search", deferredQuery, params.dataset],
    queryFn: ({ pageParam = 0 }) =>
      fetchPublicSearch({
        q: deferredQuery,
        dataset: params.dataset ?? undefined,
        limit: RESULTS_PER_PAGE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.hits.length;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    enabled: hasQuery,
    staleTime: 30_000,
  });

  const hits = useMemo(
    () => infiniteQuery.data?.pages.flatMap((page) => page.hits) ?? [],
    [infiniteQuery.data?.pages]
  );

  const firstPage = infiniteQuery.data?.pages[0];

  const setQuery = useCallback(
    (q: string) => setParams({ q: q || null }),
    [setParams]
  );

  const setDataset = useCallback(
    (dataset: string | null) => setParams({ dataset }),
    [setParams]
  );

  return {
    query: params.q,
    dataset: params.dataset,
    hasQuery,
    hits,
    total: firstPage?.total ?? 0,
    facets: firstPage?.facets,
    timing: firstPage?.timing,
    isLoading: infiniteQuery.isLoading && hasQuery,
    isFetching: infiniteQuery.isFetching,
    hasNextPage: infiniteQuery.hasNextPage,
    fetchNextPage: infiniteQuery.fetchNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    error: infiniteQuery.error?.message ?? null,
    setQuery,
    setDataset,
  };
}
