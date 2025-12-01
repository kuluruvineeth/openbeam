"use client";

import { useSearch } from "@/hooks/use-search";
import { SearchEmptyState } from "./search-empty-state";
import { SearchFilters } from "./search-filters";
import { SearchInput } from "./search-input";
import { SearchResults } from "./search-results";
import { SearchResultsSkeleton } from "./search-skeleton";

export function SearchPageContent() {
  const {
    query,
    setQuery,
    documents,
    hasQuery,
    hasResults,
    isEmpty,
    isSearching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    connectorTypes,
    setConnectorTypes,
    documentTypes,
    setDocumentTypes,
    sourceTypes,
    setSourceTypes,
    statuses,
    setStatuses,
    priorities,
    setPriorities,
    dateRange,
    setDateRange,
    ranking,
    setRanking,
    resetFilters,
    activeFilterCount,
    queryTime,
    total,
  } = useSearch();

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <div className="sticky top-0 z-10 shrink-0 space-y-6 bg-background pb-4">
        <SearchInput onChange={setQuery} value={query} />

        {hasQuery && (
          <SearchFilters
            activeFilterCount={activeFilterCount}
            connectorTypes={connectorTypes}
            dateRange={dateRange}
            documentTypes={documentTypes}
            onClearAll={resetFilters}
            onConnectorTypesChange={setConnectorTypes}
            onDateRangeChange={setDateRange}
            onDocumentTypesChange={setDocumentTypes}
            onPrioritiesChange={setPriorities}
            onRankingChange={setRanking}
            onSourceTypesChange={setSourceTypes}
            onStatusesChange={setStatuses}
            priorities={priorities}
            ranking={ranking}
            sourceTypes={sourceTypes}
            statuses={statuses}
          />
        )}
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        {isSearching && !hasResults && <SearchResultsSkeleton />}
        {isEmpty && <SearchEmptyState query={query} />}
        {hasResults && (
          <SearchResults
            documents={documents}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage ?? false}
            isFetchingNextPage={isFetchingNextPage}
            queryTime={queryTime}
            total={total}
          />
        )}
      </div>
    </div>
  );
}
