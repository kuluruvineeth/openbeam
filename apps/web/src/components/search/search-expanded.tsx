"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OverviewPanel } from "@/components/overview";
import { SearchEmptyState } from "@/components/search/search-empty-state";
import { SearchFilters } from "@/components/search/search-filters";
import { SearchInputBar } from "@/components/search/search-input-bar";
import { SearchLayout } from "@/components/search/search-layout";
import { SearchPreviewSheet } from "@/components/search/search-preview-sheet";
import { SearchResults } from "@/components/search/search-results";
import { SearchResultsSkeleton } from "@/components/search/search-skeleton";
import {
  type PreviewType,
  useDocumentPreview,
} from "@/hooks/use-document-preview";
import { useOverview } from "@/hooks/use-overview";
import { useSearch } from "@/hooks/use-search";
import { useSearchNavigation } from "@/hooks/use-search-navigation";
import type { MediaDocument, SearchResultDocument } from "@/lib/search-types";

export function SearchExpanded() {
  const {
    query,
    setQuery,
    debouncedQuery,
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
    authors,
    setAuthors,
    dateRange,
    setDateRange,
    resetFilters,
    activeFilterCount,
    connectorFacets,
  } = useSearch();

  const {
    content: overviewContent,
    citations: overviewCitations,
    isLoading: overviewIsLoading,
    isStreaming: overviewIsStreaming,
    error: overviewError,
    groundingScore: overviewGroundingScore,
    steps: overviewSteps,
    thinkingMessage: overviewThinkingMessage,
    statusMessage: overviewStatusMessage,
    thinking: overviewThinking,
    currentQuery: overviewCurrentQuery,
    generateOverview,
    reset: resetOverview,
  } = useOverview();
  const { previewId, previewType, openPreview, closePreview } =
    useDocumentPreview();
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    if (debouncedQuery && debouncedQuery.trim().length >= 3) {
      if (overviewCurrentQuery !== debouncedQuery) {
        generateOverview(debouncedQuery);
      }
    } else {
      resetOverview();
    }
  }, [debouncedQuery, overviewCurrentQuery, generateOverview, resetOverview]);

  const previewMediaData = useMemo(() => {
    if (!previewId || previewType !== "media") {
      return null;
    }
    const mediaItem = unifiedItems.find(
      (item) => item.type === "media" && item.data.id === previewId
    );
    return mediaItem?.type === "media"
      ? (mediaItem.data as MediaDocument)
      : null;
  }, [previewId, previewType, unifiedItems]);

  const handleSelectDocument = useCallback(
    (_: SearchResultDocument, index: number) => setSelectedIndex(index),
    []
  );

  const handlePreviewDocument = useCallback(
    (doc: SearchResultDocument, type: PreviewType) => {
      openPreview(doc.id, type);
    },
    [openPreview]
  );

  const handleSelectMedia = useCallback(
    (_: MediaDocument, index: number) => setSelectedIndex(index),
    []
  );

  const handlePreviewMedia = useCallback(
    (mediaItem: MediaDocument) => {
      openPreview(mediaItem.id, "media");
    },
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
    <SearchLayout
      connectorFacets={connectorFacets}
      isSearching={isSearching}
      onConnectorTypesChange={setConnectorTypes}
      selectedConnectorTypes={connectorTypes}
      showSources={hasQuery}
    >
      <div className="flex h-full flex-col">
        <header className="sticky top-0 z-10 shrink-0 space-y-4 bg-background pb-4">
          <SearchInputBar
            isSearching={isSearching}
            onChange={setQuery}
            value={query}
          />
          {hasQuery && (
            <SearchFilters
              activeFilterCount={activeFilterCount}
              authors={authors}
              dateRange={dateRange}
              documentTypes={documentTypes}
              onAuthorsChange={setAuthors}
              onClearAll={resetFilters}
              onDateRangeChange={setDateRange}
              onDocumentTypesChange={setDocumentTypes}
            />
          )}
        </header>

        <section className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
          {hasQuery && (overviewIsLoading || overviewContent) && (
            <OverviewPanel
              citations={overviewCitations}
              content={overviewContent}
              error={overviewError}
              groundingScore={overviewGroundingScore}
              isLoading={overviewIsLoading}
              isStreaming={overviewIsStreaming}
              statusMessage={overviewStatusMessage}
              steps={overviewSteps}
              thinking={overviewThinking}
              thinkingMessage={overviewThinkingMessage}
            />
          )}
          {isSearching && !hasResults && <SearchResultsSkeleton />}
          {isEmpty && <SearchEmptyState query={query} />}
          {hasResults && (
            <SearchResults
              fetchNextPage={fetchNextPage}
              hasNextPage={hasNextPage ?? false}
              isFetchingNextPage={isFetchingNextPage}
              items={unifiedItems}
              onPreviewDocument={handlePreviewDocument}
              onPreviewMedia={handlePreviewMedia}
              onSelectDocument={handleSelectDocument}
              onSelectMedia={handleSelectMedia}
              previewId={previewId}
              selectedIndex={selectedIndex}
            />
          )}
        </section>
      </div>

      <SearchPreviewSheet
        mediaData={previewMediaData}
        onClose={closePreview}
        previewId={previewId}
        previewType={previewType}
      />
    </SearchLayout>
  );
}
