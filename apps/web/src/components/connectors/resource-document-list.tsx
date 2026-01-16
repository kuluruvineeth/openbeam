"use client";

import { Input, Skeleton } from "@openplane/ui";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import {
  getDocTypeConfig,
  ICON_SIZE,
} from "@/components/connectors/resource-icons";
import { Icons } from "@/components/icons";
import {
  type ResourceDocument,
  useResourceDocuments,
} from "@/hooks/use-connector";
import type { PreviewType } from "@/hooks/use-document-preview";
import { getPreviewCategory } from "@/lib/file-preview-config";
import { cn } from "@/lib/utils";

function DocumentItem({
  doc,
  connectorType,
  isSelected,
  onSelect,
}: {
  doc: ResourceDocument;
  connectorType: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { icon: Icon, style } = getDocTypeConfig(doc.documentType);
  const previewCategory = getPreviewCategory(connectorType, doc.documentType);
  const isPreviewable =
    doc.source === "file" || doc.source === "media" || !!previewCategory;
  const title = doc.title ?? "Untitled";

  if (isPreviewable) {
    return (
      <button
        className={cn(
          "group ml-9 flex w-[calc(100%-2.25rem)] items-center gap-2.5 border-border/30 border-l py-1.5 pr-2 pl-4 text-left transition-colors hover:bg-foreground/5",
          isSelected && "bg-foreground/5"
        )}
        onClick={onSelect}
        type="button"
      >
        <Icon className={cn("shrink-0", style)} size={ICON_SIZE.sm} />
        <span className="min-w-0 flex-1 truncate text-foreground/70 text-xs group-hover:text-foreground">
          {title}
        </span>
        <Icons.Eye
          className="shrink-0 text-foreground/30 opacity-0 transition-opacity group-hover:opacity-100"
          size={ICON_SIZE.sm}
        />
        <span className="font-mono text-[10px] text-foreground/30 tabular-nums">
          {formatDistanceToNow(new Date(doc.indexedAt), { addSuffix: true })}
        </span>
      </button>
    );
  }

  return (
    <div className="ml-9 flex items-center gap-2.5 border-border/30 border-l py-1.5 pl-4">
      <Icon className={cn("shrink-0", style)} size={ICON_SIZE.sm} />
      <span className="min-w-0 flex-1 truncate text-foreground/70 text-xs">
        {title}
      </span>
      <span className="font-mono text-[10px] text-foreground/30 tabular-nums">
        {formatDistanceToNow(new Date(doc.indexedAt), { addSuffix: true })}
      </span>
    </div>
  );
}

function DocumentListSkeleton() {
  return (
    <div className="space-y-px">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div
          className="ml-9 flex items-center gap-2.5 border-border/30 border-l py-1.5 pl-4"
          key={`doc-skeleton-${idx}`}
        >
          <Skeleton className="size-3" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="ml-auto h-2.5 w-12" />
        </div>
      ))}
    </div>
  );
}

const MIN_DOCS_FOR_SEARCH = 5;

export function ResourceDocumentList({
  connectorId,
  connectorType,
  resourceExternalId,
  enabled,
  previewId,
  onSelectDocument,
}: {
  connectorId: string;
  connectorType: string;
  resourceExternalId: string;
  enabled: boolean;
  previewId: string | null;
  onSelectDocument: (docId: string, previewType: PreviewType) => void;
}) {
  const [search, setSearch] = useState("");
  const {
    documents,
    totalCount,
    isLoading,
    isFetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useResourceDocuments(connectorId, resourceExternalId, {
    enabled,
    search,
  });

  if (!enabled) {
    return null;
  }
  if (isLoading && documents.length === 0) {
    return <DocumentListSkeleton />;
  }

  const showSearch = totalCount > MIN_DOCS_FOR_SEARCH || search;

  return (
    <div>
      {showSearch && (
        <div className="ml-9 flex items-center gap-2 border-border/30 border-l py-1.5 pl-4">
          <div className="relative">
            <Icons.SearchIcon
              className="-translate-y-1/2 absolute top-1/2 left-2 text-foreground/30"
              size={10}
            />
            <Input
              className="h-6 w-34 bg-transparent pr-6 pl-6 text-[10px]"
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Search documents..."
              value={search}
            />
            {search && (
              <button
                className="-translate-y-1/2 absolute top-1/2 right-1.5 text-foreground/30 hover:text-foreground/60"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearch("");
                }}
                type="button"
              >
                <Icons.XIcon size={10} />
              </button>
            )}
          </div>
          {isFetching && !isFetchingNextPage && (
            <Icons.Loader2Icon
              className="animate-spin text-foreground/30"
              size={10}
            />
          )}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="ml-9 border-border/30 border-l py-2 pl-4 text-[10px] text-foreground/40">
          {search ? "No matching documents" : "No indexed content found"}
        </div>
      ) : (
        <>
          {documents.map((doc) => {
            const previewType: PreviewType =
              doc.source === "media"
                ? "media"
                : (getPreviewCategory(connectorType, doc.documentType) ??
                  "document");
            return (
              <DocumentItem
                connectorType={connectorType}
                doc={doc}
                isSelected={previewId === doc.id}
                key={doc.id}
                onSelect={() => onSelectDocument(doc.id, previewType)}
              />
            );
          })}
          {hasNextPage && (
            <button
              className="ml-9 border-border/30 border-l py-1.5 pl-4 text-[10px] text-foreground/40 hover:text-foreground/60 disabled:opacity-50"
              disabled={isFetchingNextPage}
              onClick={(e) => {
                e.stopPropagation();
                fetchNextPage();
              }}
              type="button"
            >
              {isFetchingNextPage
                ? "Loading..."
                : `Load more (${documents.length}/${totalCount})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
