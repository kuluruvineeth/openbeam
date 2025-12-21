"use client";

import {
  formatDistanceToNow,
  formatDistanceToNowStrict,
  isPast,
} from "date-fns";
import { Icons } from "@/components/icons";
import { getSyncStatusConfig } from "@/lib/sync-status";
import {
  isSyncing,
  parseSyncSummary,
  type SyncStatusType,
} from "@/lib/sync-types";
import { SyncErrorAlert } from "./sync-error-alert";

type SyncStatusCardProps = {
  connectorId: string;
  syncStatus: SyncStatusType | undefined;
};

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div>
      <p className="text-[10px] text-foreground/40 uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`font-mono text-base tabular-nums ${color ?? "text-foreground/80"}`}
      >
        {value}
      </p>
    </div>
  );
}

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
  const syncing = isSyncing(syncStatus);
  const config = getSyncStatusConfig(syncStatus?.connector?.status);
  const StatusIcon = config.icon;
  const latest = syncStatus?.latestSync;
  const showLatestStats = latest && latest.status !== "SYNCING";

  const filesProcessing = syncStatus?.processing?.filesProcessing ?? 0;
  const mediaProcessing = syncStatus?.processing?.mediaProcessing ?? 0;
  const totalProcessing = filesProcessing + mediaProcessing;

  const summary = parseSyncSummary(latest?.summary);
  const totalAdded =
    (latest?.dataAdded ?? 0) +
    (summary.filesQueued ?? 0) +
    (summary.mediaQueued ?? 0);

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

      <div className="grid grid-cols-3 gap-4 border-border/50 border-y py-4">
        <Stat
          label="Indexed"
          value={syncStatus?.stats?.totalIndexed?.toLocaleString() ?? "0"}
        />
        {showLatestStats && (
          <>
            <Stat
              color="text-openplane-green"
              label="Added"
              value={`+${totalAdded}`}
            />
            <Stat
              color="text-openplane-blue"
              label="Updated"
              value={latest.dataUpdated}
            />
          </>
        )}
        {totalProcessing > 0 && (
          <Stat
            color="text-openplane-orange"
            label="Processing"
            value={totalProcessing}
          />
        )}
        {!showLatestStats && syncing && (
          <>
            <Stat color="text-foreground/30" label="Added" value="—" />
            <Stat color="text-foreground/30" label="Updated" value="—" />
          </>
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
          <div className="flex items-center gap-2 text-[11px] text-openplane-green">
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
