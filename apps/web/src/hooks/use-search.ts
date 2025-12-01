"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import {
  createLoader,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  type SetValues,
  useQueryStates,
} from "nuqs";
import { useCallback, useMemo } from "react";
import {
  DATE_RANGE_OPTIONS,
  type DateRangeType,
  DOCUMENT_TYPE_OPTIONS,
  getDateRangeTimestamps,
  PRIORITY_OPTIONS,
  RANKING_OPTIONS,
  type SearchRanking,
  SOURCE_TYPE_OPTIONS,
  STATUS_OPTIONS,
} from "@/lib/search-config";
import type { SearchFilters } from "@/lib/search-types";
import { useTRPC } from "@/trpc/client";
import { useDebounce } from "./use-debounce";

export {
  DOCUMENT_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
  SOURCE_TYPE_OPTIONS,
  STATUS_OPTIONS,
};
export type { SearchFilters, SearchResultDocument } from "@/lib/search-types";

export const searchParamsSchema = {
  q: parseAsString.withDefault(""),
  apps: parseAsArrayOf(parseAsString),
  types: parseAsArrayOf(parseAsString),
  sources: parseAsArrayOf(parseAsString),
  statuses: parseAsArrayOf(parseAsString),
  priorities: parseAsArrayOf(parseAsString),
  labels: parseAsArrayOf(parseAsString),
  dateRange: parseAsStringLiteral(DATE_RANGE_OPTIONS),
  fromDate: parseAsInteger,
  toDate: parseAsInteger,
  ranking: parseAsStringLiteral(RANKING_OPTIONS).withDefault("hybrid"),
  offset: parseAsInteger.withDefault(0),
};

export const loadSearchParams = createLoader(searchParamsSchema);

type SearchParams = SetValues<typeof searchParamsSchema>;
type ArrayFilterKey =
  | "apps"
  | "types"
  | "sources"
  | "statuses"
  | "priorities"
  | "labels";

function createArrayFilterSetter(
  key: ArrayFilterKey,
  setParams: (values: Partial<SearchParams>) => void
) {
  return (value: string[] | null) =>
    setParams({
      [key]: value?.length ? value : null,
      offset: 0,
    } as Partial<SearchParams>);
}

const LIMIT = 20;

export function useSearch(options?: { debounceMs?: number }) {
  const debounceMs = options?.debounceMs ?? 300;
  const trpc = useTRPC();

  const [params, setParams] = useQueryStates(searchParamsSchema);
  const debouncedQuery = useDebounce(params.q, debounceMs);
  const shouldSearch = debouncedQuery.trim().length > 0;

  const dateTimestamps = useMemo(
    () =>
      params.dateRange === "custom"
        ? {
            fromDate: params.fromDate ?? undefined,
            toDate: params.toDate ?? undefined,
          }
        : getDateRangeTimestamps(params.dateRange),
    [params.dateRange, params.fromDate, params.toDate]
  );

  const searchQuery = useInfiniteQuery({
    ...trpc.search.query.infiniteQueryOptions(
      {
        q: debouncedQuery,
        connectorTypes: params.apps ?? undefined,
        documentTypes: params.types ?? undefined,
        sourceTypes: params.sources ?? undefined,
        statuses: params.statuses ?? undefined,
        priorities: params.priorities ?? undefined,
        labels: params.labels ?? undefined,
        fromDate: dateTimestamps.fromDate,
        toDate: dateTimestamps.toDate,
        ranking: params.ranking,
        limit: LIMIT,
      },
      { getNextPageParam: (lastPage) => lastPage.nextCursor }
    ),
    enabled: shouldSearch,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const setQuery = useCallback(
    (value: string) => setParams({ q: value || null, offset: 0 }),
    [setParams]
  );
  const setConnectorTypes = useCallback(
    createArrayFilterSetter("apps", setParams),
    [setParams]
  );
  const setDocumentTypes = useCallback(
    createArrayFilterSetter("types", setParams),
    [setParams]
  );
  const setSourceTypes = useCallback(
    createArrayFilterSetter("sources", setParams),
    [setParams]
  );
  const setStatuses = useCallback(
    createArrayFilterSetter("statuses", setParams),
    [setParams]
  );
  const setPriorities = useCallback(
    createArrayFilterSetter("priorities", setParams),
    [setParams]
  );
  const setLabels = useCallback(createArrayFilterSetter("labels", setParams), [
    setParams,
  ]);

  const setDateRange = useCallback(
    (value: DateRangeType | null) =>
      setParams({ dateRange: value, fromDate: null, toDate: null, offset: 0 }),
    [setParams]
  );

  const setCustomDateRange = useCallback(
    (from: number | null, to: number | null) =>
      setParams({ dateRange: "custom", fromDate: from, toDate: to, offset: 0 }),
    [setParams]
  );

  const setRanking = useCallback(
    (value: SearchRanking) => setParams({ ranking: value, offset: 0 }),
    [setParams]
  );

  const setOffset = useCallback(
    (value: number) => setParams({ offset: value }),
    [setParams]
  );

  const resetFilters = useCallback(
    () =>
      setParams({
        apps: null,
        types: null,
        sources: null,
        statuses: null,
        priorities: null,
        labels: null,
        dateRange: null,
        fromDate: null,
        toDate: null,
        ranking: "hybrid",
        offset: 0,
      }),
    [setParams]
  );

  const clearSearch = useCallback(
    () => setParams({ q: null, ...resetFilters }),
    [setParams, resetFilters]
  );

  const documents = useMemo(
    () => searchQuery.data?.pages.flatMap((p) => p.documents) ?? [],
    [searchQuery.data?.pages]
  );

  const hasQuery = params.q.trim().length > 0;
  const hasResults = documents.length > 0;
  const isEmpty = shouldSearch && !searchQuery.isLoading && !hasResults;
  const total = searchQuery.data?.pages[0]?.total ?? 0;
  const queryTime = searchQuery.data?.pages[0]?.queryTime ?? 0;

  const activeFilterCount =
    (params.apps?.length ?? 0) +
    (params.types?.length ?? 0) +
    (params.sources?.length ?? 0) +
    (params.statuses?.length ?? 0) +
    (params.priorities?.length ?? 0) +
    (params.labels?.length ?? 0) +
    (params.dateRange ? 1 : 0) +
    (params.ranking !== "hybrid" ? 1 : 0);

  const filters: SearchFilters = useMemo(
    () => ({
      connectorTypes: params.apps ?? [],
      documentTypes: params.types ?? [],
      sourceTypes: params.sources ?? [],
      statuses: params.statuses ?? [],
      priorities: params.priorities ?? [],
      labels: params.labels ?? [],
      dateRange: params.dateRange,
      fromDate: params.fromDate,
      toDate: params.toDate,
      ranking: params.ranking,
      offset: params.offset,
    }),
    [params]
  );

  return {
    query: params.q,
    debouncedQuery,
    documents,
    total,
    queryTime,
    isLoading: searchQuery.isLoading,
    isFetching: searchQuery.isFetching,
    isFetchingNextPage: searchQuery.isFetchingNextPage,
    isSearching:
      shouldSearch && (searchQuery.isLoading || searchQuery.isFetching),
    hasQuery,
    hasResults,
    isEmpty,
    error: searchQuery.error,
    isError: searchQuery.isError,
    hasMore: searchQuery.hasNextPage,
    hasNextPage: searchQuery.hasNextPage,
    fetchNextPage: searchQuery.fetchNextPage,
    filters,
    connectorTypes: params.apps ?? [],
    documentTypes: params.types ?? [],
    sourceTypes: params.sources ?? [],
    statuses: params.statuses ?? [],
    priorities: params.priorities ?? [],
    labels: params.labels ?? [],
    dateRange: params.dateRange,
    ranking: params.ranking,
    offset: params.offset,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
    setQuery,
    setConnectorTypes,
    setDocumentTypes,
    setSourceTypes,
    setStatuses,
    setPriorities,
    setLabels,
    setDateRange,
    setCustomDateRange,
    setRanking,
    setOffset,
    resetFilters,
    clearSearch,
    refetch: searchQuery.refetch,
    data: searchQuery.data,
  };
}

export function useSearchAutocomplete(
  prefix: string,
  options?: { enabled?: boolean }
) {
  const trpc = useTRPC();
  const debouncedPrefix = useDebounce(prefix, 150);
  const shouldFetch =
    debouncedPrefix.trim().length >= 2 && options?.enabled !== false;

  return useQuery({
    ...trpc.search.autocomplete.queryOptions({
      prefix: debouncedPrefix,
      limit: 8,
    }),
    enabled: shouldFetch,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
}

export function useRecentDocuments(options?: {
  hours?: number;
  limit?: number;
}) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.search.recent.queryOptions({
      hours: options?.hours ?? 24,
      limit: options?.limit ?? 10,
    }),
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
}
