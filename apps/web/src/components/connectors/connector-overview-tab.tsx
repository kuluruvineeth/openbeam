"use client";

import { appStore } from "@openplane/integrations";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { AppLogo } from "@/components/integrations/app-logo";
import { SyncStatusCard } from "@/components/sync/sync-status-card";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useConnector } from "@/hooks/use-connector";
import { useSyncStatus } from "@/hooks/use-sync";
import { useTRPC } from "@/trpc/client";

type ConnectorOverviewTabProps = {
  connectorId: string;
};

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-1.5 h-3 w-24" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <div className="grid gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`stat-${i}`}>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-8 w-16" />
              </div>
            ))}
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

export function ConnectorOverviewTab({
  connectorId,
}: ConnectorOverviewTabProps) {
  const { data: connector, isLoading: isLoadingConnector } =
    useConnector(connectorId);
  const { data: syncStatus, isLoading: isLoadingSyncStatus } = useSyncStatus(
    connectorId,
    { enabled: !!connectorId }
  );

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const triggerSync = useMutation({
    ...trpc.apps.triggerSync.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.apps.getSyncStatus.queryOptions({ connectorId })
          .queryKey,
      });
      toast.success("Sync triggered successfully");
    },
    onError: () => {
      toast.error("Failed to trigger sync");
    },
  });

  const app =
    connector?.definition ??
    appStore.find(
      (a) => a.id.toUpperCase() === connector?.app?.toUpperCase()
    ) ??
    null;

  if (isLoadingConnector || isLoadingSyncStatus) {
    return <OverviewSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Connector Info Card */}
      {app && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <AppLogo app={app} size={40} />
              <div className="flex-1">
                <CardTitle className="text-lg">
                  {connector?.definition?.name || app.name}
                </CardTitle>
                <p className="mt-1 text-foreground/50 text-xs">{app.id}</p>
              </div>
              <Button
                disabled={triggerSync.isPending}
                onClick={() =>
                  triggerSync.mutate({ connectorId, type: "FULL" })
                }
                size="sm"
                variant="outline"
              >
                <Icons.Sparkle className="mr-2" size={14} />
                Sync Now
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Sync Status - This is the summary view */}
      <SyncStatusCard connectorId={connectorId} syncStatus={syncStatus} />
    </div>
  );
}
