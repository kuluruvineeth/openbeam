"use client";

import { formatDistanceToNow } from "date-fns";
import { getSyncHistoryStatusConfig } from "@/lib/sync-status";
import type { SyncHistoryEntry } from "@/lib/sync-types";

type SyncHistoryItemProps = {
  entry: SyncHistoryEntry;
};

export function SyncHistoryItem({ entry }: SyncHistoryItemProps) {
  const config = getSyncHistoryStatusConfig(entry.status);
  const StatusIcon = config.icon;

  let duration = "—";
  if (entry.durationMs) {
    if (entry.durationMs < 1000) {
      duration = `${entry.durationMs}ms`;
    } else {
      duration = `${(entry.durationMs / 1000).toFixed(1)}s`;
    }
  }

  return (
    <div className="border border-border bg-background-50 p-3 transition-colors hover:bg-background-100">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div
              className={`${config.className} px-2 py-0.5 font-mono text-[10px]`}
            >
              <div className="flex items-center gap-1">
                <StatusIcon className={config.iconClass} size={10} />
                {config.label}
              </div>
            </div>
            <span className="text-muted-foreground text-xs">
              {entry.syncJob?.type ?? "FULL"}
            </span>
            <span className="text-muted-foreground text-xs">•</span>
            <span className="text-muted-foreground text-xs">
              {formatDistanceToNow(new Date(entry.startedAt), {
                addSuffix: true,
              })}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-mono">{duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Added:</span>
              <span className="font-mono text-green-600 dark:text-green-400">
                +{entry.dataAdded}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Updated:</span>
              <span className="font-mono text-blue-600 dark:text-blue-400">
                {entry.dataUpdated}
              </span>
            </div>
            {entry.dataDeleted > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Deleted:</span>
                <span className="font-mono text-red-600 dark:text-red-400">
                  -{entry.dataDeleted}
                </span>
              </div>
            )}
          </div>

          {entry.errorMessage && (
            <p className="text-destructive text-xs">{entry.errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
