import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useTRPC } from "@/lib/trpc";
import {
  getDateRangeTimestamps,
  SEARCH_DEBOUNCE_MS,
  SEARCH_RESULTS_LIMIT,
} from "../constants";
import type {
  ContentType,
  DateRangeType,
  MediaDocument,
  SearchFilters,
  SearchRanking,
  SearchResultDocument,
  UnifiedSearchItem,
} from "../types";
import { useDebounce } from "./use-debounce";

export function useSearch(options?: { debounceMs?: number }) {
  const debounceMs = options?.debounceMs ?? SEARCH_DEBOUNCE_MS;
  const trpc = useTRPC();

  const [query, setQueryRaw] = useState("");
  const [contentType, setContentType] = useState<ContentType>("all");
  const [connectorTypes, setConnectorTypes] = useState<string[]>([]);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [sourceTypes, setSourceTypes] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [authors, setAuthors] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeType | null>(null);
  const [ranking, setRanking] = useState<SearchRanking>("hybrid_v2");

  const debouncedQuery = useDebounce(query, debounceMs);
  const shouldSearch = debouncedQuery.trim().length > 0;

  const dateTimestamps = useMemo(
    () => getDateRangeTimestamps(dateRange),
    [dateRange]
  );

  const includeDocuments = contentType !== "media";
  const includeMedia = contentType !== "documents";
  const apiRanking = ranking === "hybrid_v2" ? "hybrid" : ranking;

  const unifiedQuery = useInfiniteQuery({
    ...trpc.search.unified.infiniteQueryOptions(
      {
        q: debouncedQuery,
        includeDocuments,
        includeMedia,
        connectorTypes: connectorTypes.length > 0 ? connectorTypes : undefined,
        documentTypes: documentTypes.length > 0 ? documentTypes : undefined,
        sourceTypes: sourceTypes.length > 0 ? sourceTypes : undefined,
        statuses: statuses.length > 0 ? statuses : undefined,
        priorities: priorities.length > 0 ? priorities : undefined,
        labels: labels.length > 0 ? labels : undefined,
        authorIds: authors.length > 0 ? authors : undefined,
        connectorId: undefined,
        sourceId: undefined,
        fromDate: dateTimestamps.fromDate,
        toDate: dateTimestamps.toDate,
        ranking: apiRanking,
        mediaRanking: "hybrid",
        limit: SEARCH_RESULTS_LIMIT,
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

  const setQuery = useCallback((value: string) => setQueryRaw(value), []);

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

    if (contentType === "documents") {
      return allItems.filter((item) => item.type === "document");
    }
    if (contentType === "media") {
      return allItems.filter((item) => item.type === "media");
    }
    return allItems;
  }, [unifiedQuery.data?.pages, contentType]);

  const hasQuery = query.trim().length > 0;
  const hasResults = unifiedItems.length > 0;
  const isEmpty = shouldSearch && !unifiedQuery.isLoading && !hasResults;
  const firstPage = unifiedQuery.data?.pages[0];
  const documentTotal = firstPage?.documentTotal ?? 0;
  const mediaTotal = firstPage?.mediaTotal ?? 0;
  const total = firstPage?.total ?? 0;
  const queryTime = firstPage?.queryTime ?? 0;

  const connectorFacets = useMemo(
    () => firstPage?.connectorFacets ?? [],
    [firstPage?.connectorFacets]
  );

  const activeFilterCount = useMemo(
    () =>
      connectorTypes.length +
      documentTypes.length +
      sourceTypes.length +
      statuses.length +
      priorities.length +
      labels.length +
      authors.length +
      (dateRange ? 1 : 0),
    [
      connectorTypes.length,
      documentTypes.length,
      sourceTypes.length,
      statuses.length,
      priorities.length,
      labels.length,
      authors.length,
      dateRange,
    ]
  );

  const filters: SearchFilters = useMemo(
    () => ({
      connectorTypes,
      documentTypes,
      sourceTypes,
      statuses,
      priorities,
      labels,
      authors,
      dateRange,
      fromDate: dateTimestamps.fromDate ?? null,
      toDate: dateTimestamps.toDate ?? null,
      ranking,
    }),
    [
      connectorTypes,
      documentTypes,
      sourceTypes,
      statuses,
      priorities,
      labels,
      authors,
      dateRange,
      dateTimestamps,
      ranking,
    ]
  );

  const resetFilters = useCallback(() => {
    setConnectorTypes([]);
    setDocumentTypes([]);
    setSourceTypes([]);
    setStatuses([]);
    setPriorities([]);
    setLabels([]);
    setAuthors([]);
    setDateRange(null);
    setRanking("hybrid_v2");
  }, []);

  const clearSearch = useCallback(() => {
    setQueryRaw("");
    setContentType("all");
    resetFilters();
  }, [resetFilters]);

  return {
    query,
    debouncedQuery,
    contentType,
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
    connectorTypes,
    documentTypes,
    sourceTypes,
    statuses,
    priorities,
    labels,
    authors,
    dateRange,
    ranking,
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
    setRanking,
    resetFilters,
    clearSearch,
    refetch: unifiedQuery.refetch,
    data: unifiedQuery.data,
    connectorFacets,
  };
}
