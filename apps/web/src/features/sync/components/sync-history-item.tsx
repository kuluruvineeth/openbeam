"use client";

import { Icons } from "@openbeam/ui";
import { formatDistanceToNow } from "date-fns";
import { getSyncHistoryStatusConfig } from "../lib/sync-status";
import { parseSyncSummary, type SyncHistoryEntry } from "../lib/sync-types";

function formatDuration(ms: number | null) {
  if (!ms) {
    return "—";
  }
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function SyncHistoryItem({ entry }: { entry: SyncHistoryEntry }) {
  const {
    icon: Icon,
    className,
    iconClass,
    label,
  } = getSyncHistoryStatusConfig(entry.status, entry.errorMessage);
  const summary = parseSyncSummary(entry.summary);

  return (
    <div className="flex items-center gap-3 border-border/40 border-b px-3 py-2.5 transition-colors last:border-b-0 hover:bg-foreground/[0.015]">
      <div
        className={`flex items-center gap-1 px-2 py-0.5 font-mono text-[10px] ${className}`}
      >
        <Icon className={iconClass} size={10} />
        {label}
      </div>

      <span className="text-[10px] text-foreground/40 uppercase tracking-wide">
        {entry.syncJob?.type ?? "FULL"}
      </span>
      <time
        className="text-[10px] text-foreground/30"
        dateTime={new Date(entry.startedAt).toISOString()}
      >
        {formatDistanceToNow(new Date(entry.startedAt), { addSuffix: true })}
      </time>

      <div className="ml-auto flex items-center gap-3">
        <span className="font-mono text-[10px] text-foreground/40">
          {formatDuration(entry.durationMs)}
        </span>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          {(entry.documentsAdded ?? entry.dataAdded ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-openbeam-green">
              <Icons.Plus size={10} />
              {entry.documentsAdded ?? entry.dataAdded}
            </span>
          )}
          {(entry.documentsUpdated ?? entry.dataUpdated ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-openbeam-blue">
              <Icons.RefreshCw size={10} />
              {entry.documentsUpdated ?? entry.dataUpdated}
            </span>
          )}
          {(entry.documentsRemoved ?? entry.dataDeleted ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <Icons.Trash size={10} />
              {entry.documentsRemoved ?? entry.dataDeleted}
            </span>
          )}
        </div>
        {((entry.filesDiscovered ?? summary.filesQueued ?? 0) > 0 ||
          (entry.mediaDiscovered ?? summary.mediaQueued ?? 0) > 0) && (
          <div className="flex items-center gap-1.5 rounded-sm border border-border/40 bg-foreground/[0.02] px-1.5 py-0.5">
            {(entry.filesDiscovered ?? summary.filesQueued ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 font-mono text-[9px] text-openbeam-orange">
                <Icons.FileText size={9} />
                {entry.filesDiscovered ?? summary.filesQueued}
              </span>
            )}
            {(entry.mediaDiscovered ?? summary.mediaQueued ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 font-mono text-[9px] text-openbeam-purple">
                <Icons.Image size={9} />
                {entry.mediaDiscovered ?? summary.mediaQueued}
              </span>
            )}
          </div>
        )}
      </div>

      {entry.errorMessage && (
        <span className="max-w-[200px] truncate text-[10px] text-destructive">
          {entry.errorMessage}
        </span>
      )}
    </div>
  );
}
