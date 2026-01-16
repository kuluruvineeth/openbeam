"use client";

import { Skeleton } from "@openplane/ui";
import { DangerZone } from "@/components/connectors/danger-zone";
import { SyncSettingsForm } from "@/components/forms/sync-settings-form";
import { useSyncStatus } from "@/hooks/use-sync";

function SettingsSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="mb-2 h-3 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="h-3 w-32" />
      <div className="flex justify-end pt-4">
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

export function ConnectorSettingsTab({ connectorId }: { connectorId: string }) {
  const { data: syncStatus, isLoading } = useSyncStatus(connectorId, {
    enabled: !!connectorId,
  });

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  const connectorStatus = syncStatus?.connector?.status ?? "ACTIVE";
  const scheduledDeletionAt = syncStatus?.connector?.scheduledDeletionAt;

  return (
    <div>
      <SyncSettingsForm
        connectorId={connectorId}
        fullSyncJob={syncStatus?.syncJobs?.full ?? null}
        incrementalSyncJob={syncStatus?.syncJobs?.incremental ?? null}
      />
      <DangerZone
        connectorId={connectorId}
        scheduledDeletionAt={scheduledDeletionAt}
        status={connectorStatus}
      />
    </div>
  );
}
