"use client";

import { useCallback, useMemo, useState } from "react";
import { AdvancedSearchPanel } from "@/components/search/advanced-search-panel";
import { SearchContentTabs } from "@/components/search/search-content-tabs";
import { SearchEmptyState } from "@/components/search/search-empty-state";
import { SearchFilters } from "@/components/search/search-filters";
import { SearchInputBar } from "@/components/search/search-input-bar";
import { SearchResults } from "@/components/search/search-results";
import { SearchResultsSkeleton } from "@/components/search/search-skeleton";
import { SearchSplitView } from "@/components/search/search-split-view";
import {
  type PreviewType,
  useDocumentPreview,
} from "@/hooks/use-document-preview";
import { useSearch } from "@/hooks/use-search";
import { useSearchNavigation } from "@/hooks/use-search-navigation";
import { useSearchShortcuts } from "@/hooks/use-search-shortcuts";
import type { MediaDocument, SearchResultDocument } from "@/lib/search-types";

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
    authors,
    setAuthors,
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
    advancedMode,
    toggleAdvancedMode,
    rrfConfigRaw,
    setRrfConfig,
  } = useSearch();

  useSearchShortcuts({ setRanking, advancedMode, toggleAdvancedMode });

  const { previewId, previewType, openPreview, closePreview } =
    useDocumentPreview();
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const previewedDocument = useMemo(() => {
    if (!previewId) {
      return null;
    }
    if (
      previewType !== "document" &&
      previewType !== "email" &&
      previewType !== "slack" &&
      previewType !== "notion"
    ) {
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
    (doc: SearchResultDocument, type: PreviewType) => openPreview(doc.id, type),
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
        <header className="sticky top-0 z-10 shrink-0 space-y-4 bg-background pb-4">
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
                advancedMode={advancedMode}
                authors={authors}
                connectorTypes={connectorTypes}
                dateRange={dateRange}
                documentTypes={documentTypes}
                onAdvancedToggle={toggleAdvancedMode}
                onAuthorsChange={setAuthors}
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
              <AdvancedSearchPanel
                config={rrfConfigRaw}
                isOpen={advancedMode}
                onConfigChange={setRrfConfig}
                onOpenChange={toggleAdvancedMode}
              />
            </div>
          )}
        </header>

        <section className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
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
        </section>
      </div>
    </SearchSplitView>
  );
}
