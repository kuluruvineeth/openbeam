"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useCallback, useDeferredValue } from "react";
import { fetchPublicSearch } from "../lib/api";

const searchParamsParsers = {
  q: parseAsString.withDefault(""),
  dataset: parseAsString,
  page: parseAsInteger.withDefault(1),
};

const RESULTS_PER_PAGE = 20;

export function usePublicSearch() {
  const [params, setParams] = useQueryStates(searchParamsParsers);
  const deferredQuery = useDeferredValue(params.q);

  const hasQuery = deferredQuery.trim().length > 0;

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["public-search", deferredQuery, params.dataset, params.page],
    queryFn: () =>
      fetchPublicSearch({
        q: deferredQuery,
        dataset: params.dataset ?? undefined,
        limit: RESULTS_PER_PAGE,
        offset: ((params.page ?? 1) - 1) * RESULTS_PER_PAGE,
      }),
    enabled: hasQuery,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const setQuery = useCallback(
    (q: string) => setParams({ q: q || null, page: 1 }),
    [setParams]
  );

  const setDataset = useCallback(
    (dataset: string | null) => setParams({ dataset, page: 1 }),
    [setParams]
  );

  return {
    query: params.q,
    dataset: params.dataset,
    hasQuery,
    hits: data?.hits ?? [],
    total: data?.total ?? 0,
    facets: data?.facets,
    timing: data?.timing,
    isLoading: isLoading && hasQuery,
    isFetching,
    error: error?.message ?? null,
    setQuery,
    setDataset,
  };
}
