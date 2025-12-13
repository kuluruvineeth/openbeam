"use client";

import { useCallback, useMemo, useState } from "react";
import { useDocumentPreview } from "@/hooks/use-document-preview";
import { useSearch } from "@/hooks/use-search";
import { useSearchNavigation } from "@/hooks/use-search-navigation";
import type { MediaDocument, SearchResultDocument } from "@/lib/search-types";
import { SearchContentTabs } from "./search-content-tabs";
import { SearchEmptyState } from "./search-empty-state";
import { SearchFilters } from "./search-filters";
import { SearchInputBar } from "./search-input-bar";
import { SearchResults } from "./search-results";
import { SearchResultsSkeleton } from "./search-skeleton";
import { SearchSplitView } from "./search-split-view";
import { SearchStats } from "./search-stats";

export function SearchExpanded() {
  const {
    query,
    setQuery,
    contentType,
    setContentType,
    documents,
    media,
    unifiedItems,
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
    documentTotal,
    mediaTotal,
  } = useSearch();

  const { previewId, previewType, openPreview, closePreview } =
    useDocumentPreview();
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const previewedDocument = useMemo(() => {
    if (!previewId || previewType !== "document") {
      return null;
    }
    return documents.find((doc) => doc.id === previewId) ?? null;
  }, [previewId, previewType, documents]);

  const previewedMedia = useMemo(() => {
    if (!previewId || previewType !== "media") {
      return null;
    }
    return media.find((m) => m.id === previewId) ?? null;
  }, [previewId, previewType, media]);

  const handleSelectDocument = useCallback(
    (_: SearchResultDocument, index: number) => setSelectedIndex(index),
    []
  );

  const handlePreviewDocument = useCallback(
    (doc: SearchResultDocument) => openPreview(doc.id, "document"),
    [openPreview]
  );

  const handleSelectMedia = useCallback(
    (_: MediaDocument, index: number) => setSelectedIndex(index),
    []
  );

  const handlePreviewMedia = useCallback(
    (mediaItem: MediaDocument) => openPreview(mediaItem.id, "media"),
    [openPreview]
  );

  const handleOpenExternal = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  useSearchNavigation({
    items: unifiedItems,
    selectedIndex,
    setSelectedIndex,
    previewId,
    openPreview,
    closePreview,
    onOpenExternal: handleOpenExternal,
    enabled: hasResults,
  });

  return (
    <SearchSplitView
      chunkIndex={previewedDocument?.chunk_index}
      highlightText={previewedDocument?.content}
      mediaData={previewedMedia}
      onClosePreview={closePreview}
      pageNumber={previewedDocument?.page_number}
      previewId={previewId}
      previewType={previewType ?? undefined}
    >
      <div className="flex h-full flex-col">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-serif text-[30px] leading-normal">Search</h1>
          <SearchStats
            documentTotal={documentTotal}
            isSearching={isSearching}
            mediaTotal={mediaTotal}
            queryTime={queryTime}
            total={total}
          />
        </div>

        <div className="sticky top-0 z-10 shrink-0 space-y-4 bg-background pb-4">
          <SearchInputBar
            isSearching={isSearching}
            onChange={setQuery}
            value={query}
          />
          {hasQuery && (
            <div className="space-y-4">
              <SearchContentTabs
                documentCount={documentTotal}
                mediaCount={mediaTotal}
                onChange={setContentType}
                value={contentType}
              />
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
            </div>
          )}
        </div>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
          {isSearching && !hasResults && <SearchResultsSkeleton />}
          {isEmpty && <SearchEmptyState query={query} />}
          {hasResults && (
            <SearchResults
              documentTotal={documentTotal}
              fetchNextPage={fetchNextPage}
              hasNextPage={hasNextPage ?? false}
              isFetchingNextPage={isFetchingNextPage}
              items={unifiedItems}
              mediaTotal={mediaTotal}
              onPreviewDocument={handlePreviewDocument}
              onPreviewMedia={handlePreviewMedia}
              onSelectDocument={handleSelectDocument}
              onSelectMedia={handleSelectMedia}
              previewId={previewId}
              queryTime={queryTime}
              selectedIndex={selectedIndex}
              total={total}
            />
          )}
        </div>
      </div>
    </SearchSplitView>
  );
}
