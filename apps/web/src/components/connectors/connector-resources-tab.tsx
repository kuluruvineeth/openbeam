"use client";

import { useState } from "react";
import { Icons } from "@/components/icons";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type ConnectorResource,
  useConnectorResources,
  useToggleResourceSync,
} from "@/hooks/use-connector";
import { cn } from "@/lib/utils";

const RESOURCE_ICONS: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  // Communication
  channel: Icons.Messages,
  private_channel: Icons.LockIcon,
  public_channel: Icons.Messages,
  thread: Icons.Messages,
  dm: Icons.Messages,
  // Storage
  folder: Icons.Folder,
  file: Icons.FileIcon,
  document: Icons.FileTextIcon,
  page: Icons.FileTextIcon,
  // Email
  label: Icons.Folder,
  mailbox: Icons.Folder,
  // Database
  database: Icons.Database,
  table: Icons.Database,
  collection: Icons.Folder,
  // People
  user: Icons.Folder,
  team: Icons.Folder,
  workspace: Icons.ConnectorIcon,
  // Projects
  project: Icons.Folder,
  board: Icons.ConnectorIcon,
  list: Icons.Folder,
  // Default
  default: Icons.Folder,
};

function getResourceIcon(type: string) {
  const normalized = type.toLowerCase();
  for (const [key, Icon] of Object.entries(RESOURCE_ICONS)) {
    if (normalized.includes(key)) {
      return Icon;
    }
  }
  return Icons.Folder;
}

function formatResourceType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ResourcesSkeleton() {
  return (
    <div className="space-y-px">
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="flex items-center gap-3 px-3 py-2" key={i}>
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
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.02]">
        <div className="-translate-x-1/2 absolute top-1/4 left-1/4">
          <Icons.Folder size={100} />
        </div>
        <div className="absolute right-1/4 bottom-1/4 translate-x-1/2">
          <Icons.FileIcon size={60} />
        </div>
      </div>
      <div className="relative z-10 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center border border-border/50 bg-background">
          <Icons.Folder className="text-foreground/30" size={20} />
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

function ResourceRow({
  resource,
  onToggle,
  disabled,
}: {
  resource: ConnectorResource;
  onToggle: (enabled: boolean) => void;
  disabled: boolean;
}) {
  const Icon = getResourceIcon(resource.resourceType);
  const isPrivate = resource.resourceType.toLowerCase().includes("private");

  return (
    <button
      className={cn(
        "group flex w-full cursor-pointer items-center gap-3 border-border/40 border-b px-3 py-2 text-left transition-colors last:border-b-0",
        disabled && "pointer-events-none",
        resource.syncEnabled
          ? "hover:bg-foreground/2"
          : "opacity-40 hover:opacity-60"
      )}
      disabled={disabled}
      onClick={() => onToggle(!resource.syncEnabled)}
      type="button"
    >
      <Checkbox
        checked={resource.syncEnabled}
        className="pointer-events-none size-3.5 border-foreground/20 data-[state=checked]:border-foreground/40 data-[state=checked]:bg-foreground data-[state=checked]:text-background"
        tabIndex={-1}
      />
      <div className="flex size-6 items-center justify-center">
        <Icon className="text-foreground/40" size={13} />
      </div>
      <span className="min-w-0 flex-1 truncate text-[13px] text-foreground/80">
        {resource.name || "Untitled"}
        {isPrivate && (
          <Icons.LockIcon
            className="ml-1.5 inline shrink-0 text-foreground/25"
            size={9}
          />
        )}
      </span>
      <div className="flex items-center gap-2 text-[10px] text-foreground/35">
        <span className="hidden group-hover:inline">
          {formatResourceType(resource.resourceType)}
        </span>
        {resource.documentCount > 0 && (
          <span className="font-mono tabular-nums">
            {resource.documentCount.toLocaleString()}
          </span>
        )}
      </div>
    </button>
  );
}

export function ConnectorResourcesTab({
  connectorId,
}: {
  connectorId: string;
}) {
  const [search, setSearch] = useState("");
  const { data: resources, isLoading } = useConnectorResources(connectorId);
  const toggle = useToggleResourceSync(connectorId);

  const filtered =
    resources?.filter((r) =>
      r.name?.toLowerCase().includes(search.toLowerCase())
    ) ?? [];

  const enabled = resources?.filter((r) => r.syncEnabled).length ?? 0;
  const total = resources?.length ?? 0;

  if (isLoading) {
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

  if (!resources?.length) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-foreground/50 text-xs tabular-nums">
          {enabled}/{total} enabled
        </p>
        <div className="relative">
          <Icons.SearchIcon
            className="-translate-y-1/2 absolute top-1/2 left-2.5 text-foreground/30"
            size={14}
          />
          <Input
            className="h-8 w-48 bg-transparent pl-8 text-xs"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter..."
            value={search}
          />
        </div>
      </div>

      <div className="border border-border/50">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-foreground/40 text-xs">
            No match for "{search}"
          </div>
        ) : (
          filtered.map((r) => (
            <ResourceRow
              disabled={toggle.isPending}
              key={r.id}
              onToggle={(on) =>
                toggle.mutate({ resourceId: r.id, syncEnabled: on })
              }
              resource={r}
            />
          ))
        )}
      </div>
    </div>
  );
}
