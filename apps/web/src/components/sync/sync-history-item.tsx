"use client";

import { formatDistanceToNow } from "date-fns";
import { getSyncHistoryStatusConfig } from "@/lib/sync-status";
import { parseSyncSummary, type SyncHistoryEntry } from "@/lib/sync-types";

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

      <div className="ml-auto flex items-center gap-3 font-mono text-[10px]">
        <span className="text-foreground/40">
          {formatDuration(entry.durationMs)}
        </span>
        {entry.dataAdded > 0 && (
          <span className="text-openplane-green">+{entry.dataAdded}</span>
        )}
        {entry.dataUpdated > 0 && (
          <span className="text-openplane-blue">{entry.dataUpdated}</span>
        )}
        {entry.dataDeleted > 0 && (
          <span className="text-destructive">-{entry.dataDeleted}</span>
        )}
        {(summary.filesQueued ?? 0) > 0 && (
          <span className="text-openplane-orange" title="Files discovered">
            {summary.filesQueued}f
          </span>
        )}
        {(summary.mediaQueued ?? 0) > 0 && (
          <span className="text-openplane-purple" title="Media discovered">
            {summary.mediaQueued}m
          </span>
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
