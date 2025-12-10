"use client";

import { useCallback, useMemo, useState } from "react";
import { Icons } from "@/components/icons";
import { useDocumentPreview } from "@/hooks/use-document-preview";
import { useSearch } from "@/hooks/use-search";
import { useSearchNavigation } from "@/hooks/use-search-navigation";
import type {
  ContentType,
  SearchResultDocument,
  VideoDocument,
} from "@/lib/search-types";
import { cn } from "@/lib/utils";
import { SearchEmptyState } from "./search-empty-state";
import { SearchFilters } from "./search-filters";
import { SearchInput } from "./search-input";
import { SearchResults } from "./search-results";
import { SearchResultsSkeleton } from "./search-skeleton";
import { SearchSplitView } from "./search-split-view";

type PreviewState = {
  id: string;
  type: "document" | "video";
};

const CONTENT_TABS: {
  id: ContentType;
  label: string;
  icon: keyof typeof Icons;
}[] = [
  { id: "all", label: "All", icon: "Search" },
  { id: "documents", label: "Documents", icon: "FileIcon" },
  { id: "videos", label: "Videos", icon: "Video" },
];

function getTabCount(
  tabId: ContentType,
  documentCount: number,
  videoCount: number
): number {
  if (tabId === "documents") {
    return documentCount;
  }
  if (tabId === "videos") {
    return videoCount;
  }
  return documentCount + videoCount;
}

function ContentTypeTabs({
  value,
  onChange,
  documentCount,
  videoCount,
}: {
  value: ContentType;
  onChange: (value: ContentType) => void;
  documentCount: number;
  videoCount: number;
}) {
  return (
    <div className="flex items-center gap-1 border border-border/50 p-1">
      {CONTENT_TABS.map((tab) => {
        const isActive = value === tab.id;
        const Icon = Icons[tab.icon];
        const count = getTabCount(tab.id, documentCount, videoCount);

        return (
          <button
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 font-mono text-xs transition-colors",
              isActive
                ? "bg-foreground/5 text-foreground"
                : "text-foreground/50 hover:bg-foreground/3 hover:text-foreground/70"
            )}
            key={tab.id}
            onClick={() => onChange(tab.id)}
            type="button"
          >
            <Icon size={14} />
            <span>{tab.label}</span>
            {count > 0 && (
              <span className="text-[10px] text-foreground/40 tabular-nums">
                {count.toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SearchPageContent() {
  const {
    query,
    setQuery,
    contentType,
    setContentType,
    documents,
    videos,
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
    videoTotal,
  } = useSearch();

  const { previewId, openPreview, closePreview } = useDocumentPreview();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);

  const previewedDocument = useMemo(() => {
    if (!previewState || previewState.type !== "document") {
      return null;
    }
    return documents.find((doc) => doc.id === previewState.id) ?? null;
  }, [previewState, documents]);

  const previewedVideo = useMemo(() => {
    if (!previewState || previewState.type !== "video") {
      return null;
    }
    return videos.find((v) => v.id === previewState.id) ?? null;
  }, [previewState, videos]);

  const handleSelectDocument = useCallback(
    (_doc: SearchResultDocument, index: number) => {
      setSelectedIndex(index);
    },
    []
  );

  const handlePreviewDocument = useCallback(
    (doc: SearchResultDocument) => {
      setPreviewState({ id: doc.id, type: "document" });
      openPreview(doc.id);
    },
    [openPreview]
  );

  const handleSelectVideo = useCallback(
    (_video: VideoDocument, index: number) => {
      setSelectedIndex(index);
    },
    []
  );

  const handlePreviewVideo = useCallback((video: VideoDocument) => {
    setPreviewState({ id: video.id, type: "video" });
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewState(null);
    closePreview();
  }, [closePreview]);

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
        setPreviewState({ id, type: "document" });
      } else {
        handleClosePreview();
      }
    },
    onOpenExternal: handleOpenExternal,
    enabled: hasResults,
  });

  const searchContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 shrink-0 space-y-4 bg-background pb-4">
        <SearchInput onChange={setQuery} value={query} />

        {hasQuery && (
          <div className="space-y-4">
            <ContentTypeTabs
              documentCount={documentTotal}
              onChange={setContentType}
              value={contentType}
              videoCount={videoTotal}
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
            onPreviewDocument={handlePreviewDocument}
            onPreviewVideo={handlePreviewVideo}
            onSelectDocument={handleSelectDocument}
            onSelectVideo={handleSelectVideo}
            previewId={previewState?.id ?? null}
            queryTime={queryTime}
            selectedIndex={selectedIndex}
            total={total}
            videoTotal={videoTotal}
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
        onClosePreview={handleClosePreview}
        pageNumber={previewedDocument?.page_number}
        previewId={previewState?.id ?? null}
        previewType={previewState?.type}
        videoData={previewedVideo}
      >
        {searchContent}
      </SearchSplitView>
    </div>
  );
}
