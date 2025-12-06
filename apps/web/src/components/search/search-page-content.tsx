"use client";

import { useCallback, useMemo, useState } from "react";
import { useDocumentPreview } from "@/hooks/use-document-preview";
import { useSearch } from "@/hooks/use-search";
import { useSearchNavigation } from "@/hooks/use-search-navigation";
import type { SearchResultDocument } from "@/lib/search-types";
import { SearchEmptyState } from "./search-empty-state";
import { SearchFilters } from "./search-filters";
import { SearchInput } from "./search-input";
import { SearchResults } from "./search-results";
import { SearchResultsSkeleton } from "./search-skeleton";
import { SearchSplitView } from "./search-split-view";

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

  const { previewId, openPreview, closePreview } = useDocumentPreview();
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const previewedDocument = useMemo(() => {
    if (!previewId) {
      return null;
    }
    return documents.find((doc) => doc.id === previewId) ?? null;
  }, [previewId, documents]);

  const handleSelect = useCallback(
    (_doc: SearchResultDocument, index: number) => {
      setSelectedIndex(index);
    },
    []
  );

  const handlePreview = useCallback(
    (doc: SearchResultDocument) => {
      openPreview(doc.id);
    },
    [openPreview]
  );

  const handleOpenExternal = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  useSearchNavigation({
    documents,
    selectedIndex,
    setSelectedIndex,
    previewId,
    setPreviewId: (id) => {
      if (id) {
        openPreview(id);
      } else {
        closePreview();
      }
    },
    onOpenExternal: handleOpenExternal,
    enabled: hasResults,
  });

  const searchContent = (
    <div className="flex h-full flex-col">
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
            onPreview={handlePreview}
            onSelect={handleSelect}
            previewId={previewId}
            queryTime={queryTime}
            selectedIndex={selectedIndex}
            total={total}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-6rem)]">
      <SearchSplitView
        chunkIndex={previewedDocument?.chunk_index}
        highlightText={previewedDocument?.content}
        onClosePreview={closePreview}
        pageNumber={previewedDocument?.page_number}
        previewId={previewId}
      >
        {searchContent}
      </SearchSplitView>
    </div>
  );
}
