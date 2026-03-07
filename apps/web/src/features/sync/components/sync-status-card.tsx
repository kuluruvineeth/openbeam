"use client";

import {
  formatDistanceToNow,
  formatDistanceToNowStrict,
  isPast,
} from "date-fns";
import { Icons } from "@/components/icons";
import { getSyncStatusConfig } from "../lib/sync-status";
import type { SyncStatusType } from "../lib/sync-types";
import { MetricBadge } from "./metric-badge";
import { SyncErrorAlert } from "./sync-error-alert";

type SyncStatusCardProps = {
  connectorId: string;
  syncStatus: SyncStatusType | undefined;
};

function NextSyncRow({
  icon: Icon,
  label,
  nextRunAt,
}: {
  icon: typeof Icons.RefreshCw;
  label: string;
  nextRunAt: Date | string;
}) {
  const next = new Date(nextRunAt);
  const timeStr = isPast(next) ? "pending" : formatDistanceToNowStrict(next);
  return (
    <div className="flex items-center justify-between text-[11px]">
      <div className="flex items-center gap-2 text-foreground/40">
        <Icon size={12} />
        <span>{label}</span>
      </div>
      <span className="font-mono text-foreground/60">{timeStr}</span>
    </div>
  );
}

export function SyncStatusCard({
  connectorId,
  syncStatus,
}: SyncStatusCardProps) {
  const config = getSyncStatusConfig(syncStatus?.connector?.status);
  const StatusIcon = config.icon;
  const latest = syncStatus?.latestSync;
  const showLatestStats = latest && latest.status !== "SYNCING";

  const documentsAdded = latest?.documentsAdded ?? latest?.dataAdded ?? 0;
  const documentsUpdated = latest?.documentsUpdated ?? latest?.dataUpdated ?? 0;
  const documentsRemoved = latest?.documentsRemoved ?? latest?.dataDeleted ?? 0;
  const filesDiscovered = latest?.filesDiscovered ?? 0;
  const mediaDiscovered = latest?.mediaDiscovered ?? 0;

  const hasDocumentMetrics =
    documentsAdded > 0 || documentsUpdated > 0 || documentsRemoved > 0;
  const hasProcessingMetrics = filesDiscovered > 0 || mediaDiscovered > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-foreground/50 text-xs">Status</span>
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 font-mono text-[10px] ${config.className}`}
        >
          <StatusIcon className={config.iconClass} size={10} />
          {config.label}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-foreground/50 text-xs">Total Indexed</span>
          <span className="font-mono text-base tabular-nums">
            {syncStatus?.stats?.totalIndexed?.toLocaleString() ?? "0"}
          </span>
        </div>

        {showLatestStats && hasDocumentMetrics && (
          <div className="space-y-3 border border-border/50 p-3">
            <p className="text-[10px] text-foreground/40 uppercase tracking-wide">
              Latest Sync
            </p>
            <div className="grid grid-cols-3 gap-3">
              {documentsAdded > 0 && (
                <MetricBadge
                  color="green"
                  icon={Icons.Plus}
                  label="Added"
                  value={documentsAdded}
                />
              )}
              {documentsUpdated > 0 && (
                <MetricBadge
                  color="blue"
                  icon={Icons.RefreshCw}
                  label="Updated"
                  value={documentsUpdated}
                />
              )}
              {documentsRemoved > 0 && (
                <MetricBadge
                  color="red"
                  icon={Icons.Trash}
                  label="Removed"
                  value={documentsRemoved}
                />
              )}
            </div>
            {hasProcessingMetrics && (
              <div className="border-border/40 border-t pt-3">
                <p className="mb-2 text-[10px] text-foreground/40 uppercase tracking-wide">
                  Processing
                </p>
                <div className="flex gap-3">
                  {filesDiscovered > 0 && (
                    <MetricBadge
                      color="orange"
                      icon={Icons.FileText}
                      label="Files"
                      value={filesDiscovered}
                      variant="compact"
                    />
                  )}
                  {mediaDiscovered > 0 && (
                    <MetricBadge
                      color="purple"
                      icon={Icons.Image}
                      label="Media"
                      value={mediaDiscovered}
                      variant="compact"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {syncStatus?.connector?.lastSyncedAt && (
          <div className="flex items-center gap-2 text-[11px] text-foreground/40">
            <Icons.History size={12} />
            <span>
              Synced{" "}
              {formatDistanceToNow(
                new Date(syncStatus.connector.lastSyncedAt),
                { addSuffix: true }
              )}
            </span>
          </div>
        )}
        {syncStatus?.syncJobs?.incremental?.nextRunAt && (
          <NextSyncRow
            icon={Icons.RefreshCw}
            label="Incremental"
            nextRunAt={syncStatus.syncJobs.incremental.nextRunAt}
          />
        )}
        {syncStatus?.syncJobs?.full?.nextRunAt && (
          <NextSyncRow
            icon={Icons.Database}
            label="Full sync"
            nextRunAt={syncStatus.syncJobs.full.nextRunAt}
          />
        )}
        {syncStatus?.webhookStatus?.enabled && (
          <div className="flex items-center gap-2 text-[11px] text-openbeam-green">
            <Icons.Webhook size={12} />
            <span>Real-time active</span>
          </div>
        )}
      </div>

      {syncStatus?.connector?.lastError && (
        <SyncErrorAlert
          connectorId={connectorId}
          error={syncStatus.connector.lastError}
        />
      )}
    </div>
  );
}
