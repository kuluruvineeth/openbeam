"use client";

import { SyncSettingsForm } from "@/components/forms/sync-settings-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSyncStatus } from "@/hooks/use-sync";

type ConnectorSettingsTabProps = {
  connectorId: string;
};

function SettingsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-1 h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div className="space-y-2" key={`setting-${i}`}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ConnectorSettingsTab({
  connectorId,
}: ConnectorSettingsTabProps) {
  const { data: syncStatus, isLoading } = useSyncStatus(connectorId, {
    enabled: !!connectorId,
  });

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  return (
    <SyncSettingsForm
      connectorId={connectorId}
      fullSyncJob={syncStatus?.syncJobs?.full ?? null}
      incrementalSyncJob={syncStatus?.syncJobs?.incremental ?? null}
    />
  );
}
