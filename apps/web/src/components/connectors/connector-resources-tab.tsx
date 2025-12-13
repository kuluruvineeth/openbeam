"use client";

import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { SearchSplitView } from "@/components/search/search-split-view";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type ConnectorResource,
  type ResourceDocument,
  useConnectorResources,
  useResourceDocuments,
  useToggleResourceSync,
} from "@/hooks/use-connector";
import { useDocumentPreview } from "@/hooks/use-document-preview";
import { cn } from "@/lib/utils";

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

const ICON_SIZE = {
  xs: 9,
  sm: 12,
  md: 13,
  lg: 14,
  xl: 20,
} as const;

const RESOURCE_ICON_MAP = new Map<string, IconComponent>([
  ["private_channel", Icons.LockIcon],
  ["public_channel", Icons.Messages],
  ["channel", Icons.Messages],
  ["thread", Icons.Messages],
  ["group_dm", Icons.Messages],
  ["dm", Icons.User],
  ["document", Icons.FileTextIcon],
  ["page", Icons.FileTextIcon],
  ["file", Icons.FileIcon],
  ["database", Icons.Database],
  ["table", Icons.Database],
  ["workspace", Icons.ConnectorIcon],
  ["board", Icons.ConnectorIcon],
  ["folder", Icons.Folder],
  ["label", Icons.Folder],
  ["mailbox", Icons.Folder],
  ["collection", Icons.Folder],
  ["user", Icons.Folder],
  ["team", Icons.Folder],
  ["project", Icons.Folder],
  ["list", Icons.Folder],
]);

const DOC_TYPE_CONFIG: Record<string, { icon: IconComponent; style: string }> =
  {
    message: { icon: Icons.Messages, style: "text-openplane-blue" },
    page: { icon: Icons.FileTextIcon, style: "text-openplane-orange" },
    image: { icon: Icons.FileImageIcon, style: "text-openplane-pink" },
    file: { icon: Icons.FileIcon, style: "text-openplane-green" },
    video: { icon: Icons.Video, style: "text-openplane-purple" },
    audio: { icon: Icons.FileAudio, style: "text-openplane-yellow" },
    application: { icon: Icons.FileIcon, style: "text-foreground/40" },
    text: { icon: Icons.FileTextIcon, style: "text-foreground/40" },
  };

const DEFAULT_DOC_CONFIG = {
  icon: Icons.FileIcon,
  style: "text-foreground/40",
};

function getResourceIcon(type: string): IconComponent {
  const normalized = type.toLowerCase();

  const exact = RESOURCE_ICON_MAP.get(normalized);
  if (exact) {
    return exact;
  }

  for (const [key, icon] of RESOURCE_ICON_MAP) {
    if (normalized.includes(key)) {
      return icon;
    }
  }

  return Icons.Folder;
}

function getDocTypeConfig(type: string) {
  const normalized = type.toLowerCase();

  for (const [key, config] of Object.entries(DOC_TYPE_CONFIG)) {
    if (normalized.includes(key)) {
      return config;
    }
  }

  return DEFAULT_DOC_CONFIG;
}

function formatResourceType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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

function DocumentItem({
  doc,
  isSelected,
  onSelect,
}: {
  doc: ResourceDocument;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { icon: Icon, style } = getDocTypeConfig(doc.documentType);
  const isPreviewable = doc.source === "file" || doc.source === "media";
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

function DocumentList({
  connectorId,
  resourceExternalId,
  enabled,
  previewId,
  onSelectDocument,
}: {
  connectorId: string;
  resourceExternalId: string;
  enabled: boolean;
  previewId: string | null;
  onSelectDocument: (docId: string) => void;
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

  const showSearch = totalCount > 5 || search;

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
          {documents.map((doc) => (
            <DocumentItem
              doc={doc}
              isSelected={previewId === doc.id}
              key={doc.id}
              onSelect={() => onSelectDocument(doc.id)}
            />
          ))}
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

function ResourceRow({
  resource,
  connectorId,
  onToggle,
  disabled,
  previewId,
  onSelectDocument,
}: {
  resource: ConnectorResource;
  connectorId: string;
  onToggle: (enabled: boolean) => void;
  disabled: boolean;
  previewId: string | null;
  onSelectDocument: (docId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = getResourceIcon(resource.resourceType);
  const isPrivate = resource.resourceType.toLowerCase().includes("private");
  // TODO: restore after testing - const hasDocuments = resource.documentCount > 0;
  // const hasDocuments = resource.documentCount > 0;
  const hasDocuments = true;

  return (
    <div className="border-border/40 border-b last:border-b-0">
      <div
        className={cn(
          "group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
          disabled && "pointer-events-none",
          resource.syncEnabled
            ? "hover:bg-foreground/2"
            : "opacity-40 hover:opacity-60"
        )}
      >
        {hasDocuments ? (
          <button
            className="flex size-4 shrink-0 items-center justify-center"
            onClick={() => setExpanded(!expanded)}
            type="button"
          >
            <Icons.ChevronRight
              className={cn(
                "text-foreground/30 transition-transform duration-150",
                expanded && "rotate-90"
              )}
              size={ICON_SIZE.sm}
            />
          </button>
        ) : (
          <div className="size-4 shrink-0" />
        )}

        <Checkbox
          checked={resource.syncEnabled}
          className="size-3.5 border-foreground/20 data-[state=checked]:border-foreground/40 data-[state=checked]:bg-foreground data-[state=checked]:text-background"
          disabled={disabled}
          onCheckedChange={(checked) => onToggle(checked === true)}
        />

        <div className="flex size-6 shrink-0 items-center justify-center">
          <Icon className="text-foreground/40" size={ICON_SIZE.md} />
        </div>

        <span className="min-w-0 flex-1 truncate text-[13px] text-foreground/80">
          {resource.name || "Untitled"}
          {isPrivate && (
            <Icons.LockIcon
              className="ml-1.5 inline shrink-0 text-foreground/25"
              size={ICON_SIZE.xs}
            />
          )}
        </span>

        <div className="flex items-center gap-2 text-[10px] text-foreground/35">
          <span className="hidden group-hover:inline">
            {formatResourceType(resource.resourceType)}
          </span>
          {hasDocuments && (
            <span className="font-mono tabular-nums">
              {resource.documentCount.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <DocumentList
          connectorId={connectorId}
          enabled={expanded}
          onSelectDocument={onSelectDocument}
          previewId={previewId}
          resourceExternalId={resource.externalId}
        />
      )}
    </div>
  );
}

export function ConnectorResourcesTab({
  connectorId,
}: {
  connectorId: string;
}) {
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
  const { previewId, openPreview, closePreview } = useDocumentPreview();

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
    <SearchSplitView onClosePreview={closePreview} previewId={previewId}>
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
