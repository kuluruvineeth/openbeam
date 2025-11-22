"use client";

import { formatDistanceToNow } from "date-fns";
import { Icons } from "@/components/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSyncStatusConfig } from "@/lib/sync-status";
import { isSyncing, type SyncStatusType } from "@/lib/sync-types";
import { SyncErrorAlert } from "./sync-error-alert";
import { SyncProgressIndicator } from "./sync-progress-indicator";

type SyncStatusCardProps = {
  connectorId: string;
  syncStatus: SyncStatusType | undefined;
};

export function SyncStatusCard({
  connectorId,
  syncStatus,
}: SyncStatusCardProps) {
  const syncing = isSyncing(syncStatus);
  const config = getSyncStatusConfig(syncStatus?.connector?.status);
  const StatusIcon = config.icon;

  return (
    <Card className="border bg-background">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="font-medium text-sm">Sync Status</CardTitle>
          <div className={config.className}>
            <div className="flex items-center gap-1.5">
              <StatusIcon className={config.iconClass} size={10} />
              {config.label}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {syncing && <SyncProgressIndicator />}

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-[#878787] text-xs">Total Documents</p>
            <p className="font-medium text-lg">
              {syncStatus?.stats?.totalIndexed ?? 0}
            </p>
          </div>
          {syncStatus?.latestSync &&
            syncStatus.latestSync.status !== "SYNCING" && (
              <>
                <div className="space-y-1">
                  <p className="text-[#878787] text-xs">Last Added</p>
                  <p className="font-medium text-green-600 text-lg dark:text-green-400">
                    +{syncStatus.latestSync.dataAdded}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[#878787] text-xs">Last Updated</p>
                  <p className="font-medium text-blue-600 text-lg dark:text-blue-400">
                    {syncStatus.latestSync.dataUpdated}
                  </p>
                </div>
              </>
            )}
          {syncing && (
            <>
              <div className="space-y-1">
                <p className="text-[#878787] text-xs">Added</p>
                <p className="font-medium text-green-600 text-lg dark:text-green-400">
                  —
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[#878787] text-xs">Updated</p>
                <p className="font-medium text-blue-600 text-lg dark:text-blue-400">
                  —
                </p>
              </div>
            </>
          )}
        </div>

        {syncStatus?.connector?.lastSyncedAt && (
          <div className="border-border border-t pt-4">
            <div className="flex items-center gap-2">
              <Icons.History className="text-muted-foreground" size={14} />
              <p className="text-[#878787] text-xs">
                Last synced{" "}
                {formatDistanceToNow(
                  new Date(syncStatus.connector.lastSyncedAt),
                  {
                    addSuffix: true,
                  }
                )}
              </p>
            </div>
          </div>
        )}

        {syncStatus?.connector?.lastError && (
          <SyncErrorAlert
            connectorId={connectorId}
            error={syncStatus.connector.lastError}
          />
        )}
      </CardContent>
    </Card>
  );
}
