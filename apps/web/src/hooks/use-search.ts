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
import type {
  ContentType,
  MediaDocument,
  SearchFilters,
  SearchResultDocument,
  UnifiedSearchItem,
} from "@/lib/search-types";
import { useTRPC } from "@/trpc/client";
import { useDebounce } from "./use-debounce";

export {
  DOCUMENT_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
  SOURCE_TYPE_OPTIONS,
  STATUS_OPTIONS,
};
export type {
  ContentType,
  MediaDocument,
  SearchFilters,
  SearchResultDocument,
  UnifiedSearchItem,
} from "@/lib/search-types";

const CONTENT_TYPE_OPTIONS = ["all", "documents", "media"] as const;

export const searchParamsSchema = {
  q: parseAsString.withDefault(""),
  content: parseAsStringLiteral(CONTENT_TYPE_OPTIONS).withDefault("all"),
  apps: parseAsArrayOf(parseAsString),
  types: parseAsArrayOf(parseAsString),
  sources: parseAsArrayOf(parseAsString),
  statuses: parseAsArrayOf(parseAsString),
  priorities: parseAsArrayOf(parseAsString),
  labels: parseAsArrayOf(parseAsString),
  authors: parseAsArrayOf(parseAsString),
  dateRange: parseAsStringLiteral(DATE_RANGE_OPTIONS),
  fromDate: parseAsInteger,
  toDate: parseAsInteger,
  ranking: parseAsStringLiteral(RANKING_OPTIONS).withDefault("hybrid"),
};

export const loadSearchParams = createLoader(searchParamsSchema);

type SearchParams = SetValues<typeof searchParamsSchema>;
type ArrayFilterKey =
  | "apps"
  | "types"
  | "sources"
  | "statuses"
  | "priorities"
  | "labels"
  | "authors";

function createArrayFilterSetter(
  key: ArrayFilterKey,
  setParams: (values: Partial<SearchParams>) => void
) {
  return (value: string[] | null) =>
    setParams({
      [key]: value?.length ? value : null,
    } as Partial<SearchParams>);
}

const LIMIT = 20;

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: central search hook managing all filter state
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

  const includeDocuments = params.content !== "media";
  const includeMedia = params.content !== "documents";

  const unifiedQuery = useInfiniteQuery({
    ...trpc.search.unified.infiniteQueryOptions(
      {
        q: debouncedQuery,
        includeDocuments,
        includeMedia,
        connectorTypes: params.apps ?? undefined,
        documentTypes: params.types ?? undefined,
        sourceTypes: params.sources ?? undefined,
        statuses: params.statuses ?? undefined,
        priorities: params.priorities ?? undefined,
        labels: params.labels ?? undefined,
        authorIds: params.authors ?? undefined,
        connectorId: undefined,
        sourceId: undefined,
        fromDate: dateTimestamps.fromDate,
        toDate: dateTimestamps.toDate,
        ranking: params.ranking,
        mediaRanking: "hybrid",
        limit: LIMIT,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialCursor: 0,
      }
    ),
    enabled: shouldSearch,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const setQuery = useCallback(
    (value: string) => setParams({ q: value || null }),
    [setParams]
  );

  const setContentType = useCallback(
    (value: ContentType) => setParams({ content: value }),
    [setParams]
  );

  const setConnectorTypes = useMemo(
    () => createArrayFilterSetter("apps", setParams),
    [setParams]
  );
  const setDocumentTypes = useMemo(
    () => createArrayFilterSetter("types", setParams),
    [setParams]
  );
  const setSourceTypes = useMemo(
    () => createArrayFilterSetter("sources", setParams),
    [setParams]
  );
  const setStatuses = useMemo(
    () => createArrayFilterSetter("statuses", setParams),
    [setParams]
  );
  const setPriorities = useMemo(
    () => createArrayFilterSetter("priorities", setParams),
    [setParams]
  );
  const setLabels = useMemo(
    () => createArrayFilterSetter("labels", setParams),
    [setParams]
  );
  const setAuthors = useMemo(
    () => createArrayFilterSetter("authors", setParams),
    [setParams]
  );

  const setDateRange = useCallback(
    (value: DateRangeType | null) =>
      setParams({ dateRange: value, fromDate: null, toDate: null }),
    [setParams]
  );

  const setCustomDateRange = useCallback(
    (from: number | null, to: number | null) =>
      setParams({ dateRange: "custom", fromDate: from, toDate: to }),
    [setParams]
  );

  const setRanking = useCallback(
    (value: SearchRanking) => setParams({ ranking: value }),
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
        authors: null,
        dateRange: null,
        fromDate: null,
        toDate: null,
        ranking: "hybrid",
      }),
    [setParams]
  );

  const clearSearch = useCallback(
    () =>
      setParams({
        q: null,
        content: "all",
        apps: null,
        types: null,
        sources: null,
        statuses: null,
        priorities: null,
        labels: null,
        authors: null,
        dateRange: null,
        fromDate: null,
        toDate: null,
        ranking: "hybrid",
      }),
    [setParams]
  );

  const documents = useMemo(() => {
    if (!unifiedQuery.data?.pages) {
      return [];
    }
    return unifiedQuery.data.pages.flatMap(
      (page) => page.documents as SearchResultDocument[]
    );
  }, [unifiedQuery.data?.pages]);

  const media = useMemo(() => {
    if (!unifiedQuery.data?.pages) {
      return [];
    }
    return unifiedQuery.data.pages.flatMap(
      (page) => page.media as MediaDocument[]
    );
  }, [unifiedQuery.data?.pages]);

  const unifiedItems: UnifiedSearchItem[] = useMemo(() => {
    if (!unifiedQuery.data?.pages) {
      return [];
    }

    const allItems = unifiedQuery.data.pages.flatMap(
      (page) => (page.items ?? []) as UnifiedSearchItem[]
    );

    if (params.content === "documents") {
      return allItems.filter((item) => item.type === "document");
    }
    if (params.content === "media") {
      return allItems.filter((item) => item.type === "media");
    }
    return allItems;
  }, [unifiedQuery.data?.pages, params.content]);

  const hasQuery = params.q.trim().length > 0;
  const hasResults = unifiedItems.length > 0;
  const isEmpty = shouldSearch && !unifiedQuery.isLoading && !hasResults;
  const firstPage = unifiedQuery.data?.pages[0];
  const documentTotal = firstPage?.documentTotal ?? 0;
  const mediaTotal = firstPage?.mediaTotal ?? 0;
  const total = firstPage?.total ?? 0;
  const queryTime = firstPage?.queryTime ?? 0;

  const activeFilterCount = useMemo(
    () =>
      (params.apps?.length ?? 0) +
      (params.types?.length ?? 0) +
      (params.sources?.length ?? 0) +
      (params.statuses?.length ?? 0) +
      (params.priorities?.length ?? 0) +
      (params.labels?.length ?? 0) +
      (params.authors?.length ?? 0) +
      (params.dateRange ? 1 : 0) +
      (params.ranking !== "hybrid" ? 1 : 0),
    [params]
  );

  const filters: SearchFilters = useMemo(
    () => ({
      connectorTypes: params.apps ?? [],
      documentTypes: params.types ?? [],
      sourceTypes: params.sources ?? [],
      statuses: params.statuses ?? [],
      priorities: params.priorities ?? [],
      labels: params.labels ?? [],
      authors: params.authors ?? [],
      dateRange: params.dateRange,
      fromDate: params.fromDate,
      toDate: params.toDate,
      ranking: params.ranking,
    }),
    [params]
  );

  return {
    query: params.q,
    debouncedQuery,
    contentType: params.content,
    documents,
    media,
    unifiedItems,
    total,
    documentTotal,
    mediaTotal,
    queryTime,
    isLoading: unifiedQuery.isLoading,
    isFetching: unifiedQuery.isFetching,
    isFetchingNextPage: unifiedQuery.isFetchingNextPage,
    isSearching:
      shouldSearch && (unifiedQuery.isLoading || unifiedQuery.isFetching),
    hasQuery,
    hasResults,
    isEmpty,
    error: unifiedQuery.error,
    isError: unifiedQuery.isError,
    hasMore: unifiedQuery.hasNextPage,
    hasNextPage: unifiedQuery.hasNextPage,
    fetchNextPage: unifiedQuery.fetchNextPage,
    filters,
    connectorTypes: params.apps ?? [],
    documentTypes: params.types ?? [],
    sourceTypes: params.sources ?? [],
    statuses: params.statuses ?? [],
    priorities: params.priorities ?? [],
    labels: params.labels ?? [],
    authors: params.authors ?? [],
    dateRange: params.dateRange,
    ranking: params.ranking,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
    setQuery,
    setContentType,
    setConnectorTypes,
    setDocumentTypes,
    setSourceTypes,
    setStatuses,
    setPriorities,
    setLabels,
    setAuthors,
    setDateRange,
    setCustomDateRange,
    setRanking,
    resetFilters,
    clearSearch,
    refetch: unifiedQuery.refetch,
    data: unifiedQuery.data,
  };
}

export function useSearchAutocomplete(
  query: string,
  options?: { enabled?: boolean }
) {
  const trpc = useTRPC();
  const debouncedQuery = useDebounce(query, 150);
  const shouldFetch =
    debouncedQuery.trim().length >= 2 && options?.enabled !== false;

  return useQuery({
    ...trpc.search.unified.queryOptions({
      q: debouncedQuery,
      limit: 8,
      includeDocuments: true,
      includeMedia: true,
      ranking: "bm25",
    }),
    enabled: shouldFetch,
    placeholderData: keepPreviousData,
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
