"use client";

import { cn, Icons } from "@openplane/ui";
import { Button } from "@openplane/ui/components/button";
import { cva } from "class-variance-authority";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFileExplorerActions } from "../hooks/use-file-explorer-actions";
import { type SortOption, usePanelStore } from "../stores/panel-store";
import {
  type ExplorerEntry,
  type ExplorerFile,
  useSessionStore,
} from "../stores/session-store";

const INDENT_PX = 16;

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "bmp",
  "svg",
  "webp",
  "ico",
]);

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "ts",
  "tsx",
  "js",
  "jsx",
  "json",
  "yml",
  "yaml",
  "toml",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "c",
  "cpp",
  "h",
  "cs",
  "swift",
  "php",
  "html",
  "css",
  "scss",
  "xml",
  "sh",
  "bash",
  "zsh",
  "ini",
  "conf",
]);

type EntryDisplayKind = "directory" | "image" | "text" | "other";

function getExtension(name: string): string | null {
  const idx = name.lastIndexOf(".");
  if (idx === -1 || idx === name.length - 1) {
    return null;
  }
  return name.slice(idx + 1).toLowerCase();
}

function getEntryDisplayKind(entry: ExplorerEntry): EntryDisplayKind {
  if (entry.kind === "directory") {
    return "directory";
  }
  const ext = getExtension(entry.name);
  if (!ext) {
    return "other";
  }
  if (IMAGE_EXTENSIONS.has(ext)) {
    return "image";
  }
  if (TEXT_EXTENSIONS.has(ext)) {
    return "text";
  }
  return "other";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sortEntries(
  entries: ExplorerEntry[],
  option: SortOption
): ExplorerEntry[] {
  return [...entries].sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === "directory" ? -1 : 1;
    }
    switch (option) {
      case "name":
        return a.name.localeCompare(b.name);
      case "modified":
        return (
          new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
        );
      case "size":
        return b.size - a.size;
      default:
        return 0;
    }
  });
}

interface TreeRow {
  entry: ExplorerEntry;
  depth: number;
}

function buildTreeRows(opts: {
  directories: Map<string, { path: string; entries: ExplorerEntry[] }>;
  expandedPaths: Set<string>;
  sortOption: SortOption;
  path: string;
  depth: number;
}): TreeRow[] {
  const { directories, expandedPaths, sortOption, path, depth } = opts;
  const dir = directories.get(path);
  if (!dir) {
    return [];
  }

  const rows: TreeRow[] = [];
  const sorted = sortEntries(dir.entries, sortOption);
  for (const entry of sorted) {
    rows.push({ entry, depth });
    if (entry.kind === "directory" && expandedPaths.has(entry.path)) {
      rows.push(
        ...buildTreeRows({
          directories,
          expandedPaths,
          sortOption,
          path: entry.path,
          depth: depth + 1,
        })
      );
    }
  }
  return rows;
}

function EntryIcon({
  kind,
  isExpanded,
}: {
  kind: EntryDisplayKind;
  isExpanded?: boolean;
}) {
  switch (kind) {
    case "directory":
      return isExpanded ? (
        <Icons.Folder className="size-4 text-primary" />
      ) : (
        <Icons.Folder className="size-4 text-primary" />
      );
    case "image":
      return <Icons.Image className="size-4 text-muted-foreground" />;
    case "text":
      return <Icons.FileText className="size-4 text-muted-foreground" />;
    default:
      return <Icons.File className="size-4 text-muted-foreground" />;
  }
}

const entryRowVariants = cva(
  "flex cursor-pointer items-center gap-2 py-0.5 pr-2 text-sm transition-colors",
  {
    variants: {
      selected: {
        true: "bg-accent/60",
        false: "hover:bg-muted/50",
      },
    },
    defaultVariants: { selected: false },
  }
);

function TreeRowItem({
  row,
  isExpanded,
  isSelected,
  isLoading,
  onPress,
}: {
  row: TreeRow;
  isExpanded: boolean;
  isSelected: boolean;
  isLoading: boolean;
  onPress: () => void;
}) {
  const displayKind = getEntryDisplayKind(row.entry);
  const isDir = row.entry.kind === "directory";

  return (
    <button
      className={entryRowVariants({ selected: isSelected })}
      onClick={onPress}
      style={{ paddingLeft: 8 + row.depth * INDENT_PX }}
      type="button"
    >
      <span className="shrink-0">
        {isLoading ? (
          <Icons.Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <EntryIcon
            isExpanded={isExpanded}
            kind={isDir ? "directory" : displayKind}
          />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-left text-foreground">
        {row.entry.name}
      </span>
      <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
        {formatFileSize(row.entry.size)}
      </span>
    </button>
  );
}

function FilePreviewPanel({
  file,
  isLoading,
  onClose,
}: {
  file: ExplorerFile | null;
  isLoading: boolean;
  onClose: () => void;
}) {
  if (isLoading && !file) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
        <Icons.Loader2 className="size-5 animate-spin" />
        <span>Loading file...</span>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
        Select a file to preview
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-border/30 border-b px-3 py-1.5">
        <span className="truncate font-medium text-foreground text-xs">
          {file.path.split("/").pop() ?? "Preview"}
        </span>
        <Button
          className="size-6"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <Icons.Close className="size-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {file.kind === "text" && (
          <pre className="whitespace-pre-wrap font-mono text-foreground text-xs">
            {file.content}
          </pre>
        )}
        {file.kind === "image" && file.content && (
          <div className="flex items-center justify-center">
            {/* biome-ignore lint/correctness/useImageSize: dynamic base64 data URI image */}
            {/* biome-ignore lint/performance/noImgElement: base64 data URI not compatible with next/image */}
            <img
              alt={file.path}
              className="max-h-[400px] max-w-full object-contain"
              src={`data:${file.mimeType ?? "image/png"};base64,${file.content}`}
            />
          </div>
        )}
        {file.kind === "binary" && (
          <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground text-sm">
            <span>Binary preview unavailable</span>
            <span className="text-xs">{formatFileSize(file.size)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "modified", label: "Modified" },
  { value: "size", label: "Size" },
];

interface FileExplorerProps {
  serverId: string;
  agentId: string;
}

export function FileExplorer({ serverId, agentId }: FileExplorerProps) {
  const explorerState = useSessionStore((state) =>
    state.sessions[serverId]?.fileExplorer.get(agentId)
  );
  const agentExists = useSessionStore(
    (state) => state.sessions[serverId]?.agents.has(agentId) ?? false
  );

  const { requestDirectoryListing, requestFilePreview, selectExplorerEntry } =
    useFileExplorerActions(serverId);

  const sortOption = usePanelStore((state) => state.explorerSortOption);
  const setSortOption = usePanelStore((state) => state.setExplorerSortOption);

  const directories = explorerState?.directories ?? new Map();
  const files = explorerState?.files ?? new Map();
  const isExplorerLoading = explorerState?.isLoading ?? false;
  const error = explorerState?.lastError ?? null;
  const selectedEntryPath = explorerState?.selectedEntryPath ?? null;
  const pendingRequest = explorerState?.pendingRequest ?? null;

  const preview = selectedEntryPath
    ? (files.get(selectedEntryPath) ?? null)
    : null;
  const isPreviewLoading = Boolean(
    isExplorerLoading &&
      pendingRequest?.mode === "file" &&
      pendingRequest?.path === selectedEntryPath
  );

  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => new Set(["."])
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!agentId || hasInitializedRef.current) {
      return;
    }
    hasInitializedRef.current = true;
    requestDirectoryListing(agentId, ".", {
      recordHistory: false,
      setCurrentPath: false,
    });
  }, [agentId, requestDirectoryListing]);

  const treeRows = useMemo(() => {
    if (!directories.has(".")) {
      return [];
    }
    return buildTreeRows({
      directories,
      expandedPaths,
      sortOption,
      path: ".",
      depth: 0,
    });
  }, [directories, expandedPaths, sortOption]);

  const handleEntryPress = useCallback(
    (entry: ExplorerEntry) => {
      if (entry.kind === "directory") {
        const isExpanded = expandedPaths.has(entry.path);
        setExpandedPaths((prev) => {
          const next = new Set(prev);
          if (isExpanded) {
            next.delete(entry.path);
          } else {
            next.add(entry.path);
          }
          return next;
        });
        if (!(isExpanded || directories.has(entry.path))) {
          requestDirectoryListing(agentId, entry.path, {
            recordHistory: false,
            setCurrentPath: false,
          });
        }
        return;
      }
      selectExplorerEntry(agentId, entry.path);
      requestFilePreview(agentId, entry.path);
    },
    [
      agentId,
      directories,
      expandedPaths,
      requestDirectoryListing,
      requestFilePreview,
      selectExplorerEntry,
    ]
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const paths = Array.from(expandedPaths);
    if (!paths.includes(".")) {
      paths.unshift(".");
    }
    await Promise.all(
      paths.map((p) =>
        requestDirectoryListing(agentId, p, {
          recordHistory: false,
          setCurrentPath: false,
        })
      )
    );
    setIsRefreshing(false);
  }, [agentId, expandedPaths, requestDirectoryListing]);

  const handleClosePreview = useCallback(() => {
    selectExplorerEntry(agentId, null);
  }, [agentId, selectExplorerEntry]);

  const handleSortCycle = useCallback(() => {
    const idx = SORT_OPTIONS.findIndex((o) => o.value === sortOption);
    const nextIdx = (idx + 1) % SORT_OPTIONS.length;
    setSortOption(SORT_OPTIONS[nextIdx].value);
  }, [sortOption, setSortOption]);

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.value === sortOption)?.label ?? "Name";

  const isDirectoryLoading = useCallback(
    (path: string) =>
      Boolean(
        isExplorerLoading &&
          pendingRequest?.mode === "list" &&
          pendingRequest?.path === path
      ),
    [isExplorerLoading, pendingRequest]
  );

  const showInitialLoading =
    !directories.has(".") &&
    isExplorerLoading &&
    pendingRequest?.mode === "list" &&
    pendingRequest?.path === ".";

  if (!agentExists) {
    return (
      <div className="flex flex-1 items-center justify-center text-destructive text-sm">
        Agent not found
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm">
        <span className="text-destructive">{error}</span>
        <Button
          onClick={() =>
            requestDirectoryListing(agentId, ".", {
              recordHistory: false,
              setCurrentPath: false,
            })
          }
          size="sm"
          variant="outline"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (showInitialLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
        <Icons.Loader2 className="size-5 animate-spin" />
        <span>Loading files...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {selectedEntryPath && (
        <div className="flex flex-1 flex-col overflow-hidden border-border/30 border-r">
          <FilePreviewPanel
            file={preview}
            isLoading={isPreviewLoading}
            onClose={handleClosePreview}
          />
        </div>
      )}

      <div
        className={cn(
          "flex flex-col overflow-hidden",
          selectedEntryPath ? "w-[280px] shrink-0" : "flex-1"
        )}
      >
        <div className="flex items-center justify-end gap-2 border-border/30 border-b px-3 py-1.5">
          <Button
            className="size-7"
            disabled={isRefreshing}
            onClick={handleRefresh}
            size="icon"
            variant="ghost"
          >
            <Icons.RefreshCw
              className={cn("size-3.5", isRefreshing && "animate-spin")}
            />
          </Button>
          <button
            className="rounded-sm border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted/50"
            onClick={handleSortCycle}
            type="button"
          >
            {currentSortLabel}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {treeRows.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-8 text-muted-foreground text-sm">
              No files
            </div>
          ) : (
            treeRows.map((row) => (
              <TreeRowItem
                isExpanded={
                  row.entry.kind === "directory" &&
                  expandedPaths.has(row.entry.path)
                }
                isLoading={
                  row.entry.kind === "directory" &&
                  isDirectoryLoading(row.entry.path)
                }
                isSelected={selectedEntryPath === row.entry.path}
                key={row.entry.path}
                onPress={() => handleEntryPress(row.entry)}
                row={row}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
