"use client";

import { Input, Skeleton } from "@openplane/ui";
import { Icons } from "@/components/icons";
import {
  useConnector,
  useConnectorResources,
  useToggleResourceSync,
} from "@/features/connectors/hooks";
import { SearchSplitView } from "@/features/search/components/search-split-view";
import { useDocumentPreview } from "@/hooks/use-document-preview";
import { ICON_SIZE } from "./resource-icons";
import { ResourceRow } from "./resource-row";

function ResourcesSkeleton() {
  return (
    <div className="space-y-px">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div
          className="flex items-center gap-3 px-3 py-2"
          key={`resource-skeleton-${idx}`}
        >
          <Skeleton className="size-3.5" />
          <Skeleton className="size-6" />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="ml-auto h-3 w-8" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="relative flex flex-col items-center justify-center py-16">
      <div className="relative z-10 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center border border-border/50 bg-background">
          <Icons.Folder className="text-foreground/30" size={ICON_SIZE.xl} />
        </div>
        <p className="font-medium text-foreground/70 text-sm">
          No resources discovered
        </p>
        <p className="mt-1 text-foreground/40 text-xs">
          Resources appear after the first sync
        </p>
      </div>
    </div>
  );
}

export function ConnectorResourcesTab({
  connectorId,
}: {
  connectorId: string;
}) {
  const { data: connector } = useConnector(connectorId);
  const connectorType = connector?.app ?? "";
  const {
    resources,
    totalCount,
    enabledCount,
    search,
    setSearch,
    clearSearch,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useConnectorResources(connectorId);
  const toggle = useToggleResourceSync(connectorId);
  const { previewId, previewType, openPreview, closePreview } =
    useDocumentPreview();

  if (isLoading && resources.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="border border-border/50">
          <ResourcesSkeleton />
        </div>
      </div>
    );
  }

  if (totalCount === 0 && !search) {
    return <EmptyState />;
  }

  return (
    <SearchSplitView
      onClosePreview={closePreview}
      previewId={previewId}
      previewType={previewType ?? undefined}
    >
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center justify-between pb-3">
          <p className="text-foreground/50 text-xs tabular-nums">
            {enabledCount}/{totalCount} enabled
          </p>
          <div className="relative">
            <Icons.SearchIcon
              className="-translate-y-1/2 absolute top-1/2 left-2.5 text-foreground/30"
              size={14}
            />
            <Input
              className="h-8 w-48 bg-transparent pr-8 pl-8 text-xs"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resources..."
              value={search}
            />
            {search && (
              <button
                className="-translate-y-1/2 absolute top-1/2 right-2 text-foreground/30 hover:text-foreground/50"
                onClick={clearSearch}
                type="button"
              >
                <Icons.XIcon size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto border border-border/50">
          {resources.length === 0 ? (
            <div className="py-8 text-center text-foreground/40 text-xs">
              No match for "{search}"
            </div>
          ) : (
            <>
              {resources.map((r) => (
                <ResourceRow
                  connectorId={connectorId}
                  connectorType={connectorType}
                  disabled={toggle.isPending}
                  key={r.id}
                  onSelectDocument={openPreview}
                  onToggle={(on) =>
                    toggle.mutate({ resourceId: r.id, syncEnabled: on })
                  }
                  previewId={previewId}
                  resource={r}
                />
              ))}
              {hasNextPage && (
                <button
                  className="flex w-full items-center justify-center py-3 text-foreground/40 text-xs hover:text-foreground/60 disabled:opacity-50"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                  type="button"
                >
                  {isFetchingNextPage
                    ? "Loading..."
                    : `Load more (${resources.length}/${totalCount})`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </SearchSplitView>
  );
}
