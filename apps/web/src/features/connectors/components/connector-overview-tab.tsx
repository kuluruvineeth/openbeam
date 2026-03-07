"use client";

import { appStore } from "@openbeam/integrations";
import { Button, Skeleton } from "@openbeam/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { AppLogo } from "@/components/integrations/app-logo";
import { useConnector } from "@/features/connectors/hooks";
import { isSyncing, SyncStatusCard, useSyncStatus } from "@/features/sync";
import { useTRPC } from "@/trpc/client";

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-1 h-3 w-20" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="grid grid-cols-3 gap-4 border-border/50 border-y py-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`stat-skeleton-${i}`}>
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="mt-1.5 h-5 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ConnectorOverviewTab({ connectorId }: { connectorId: string }) {
  const { data: connector, isLoading: isLoadingConnector } =
    useConnector(connectorId);
  const { data: syncStatus, isLoading: isLoadingSyncStatus } = useSyncStatus(
    connectorId,
    {
      enabled: !!connectorId,
    }
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
      toast.success("Sync triggered");
    },
    onError: () => {
      toast.error("Sync failed");
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
      {app && (
        <div className="flex items-center gap-3">
          <AppLogo app={app} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-[15px]">
              {connector?.definition?.name || app.name}
            </p>
            <p className="text-[11px] text-foreground/40">{app.id}</p>
          </div>
          <Button
            className="h-8 gap-1.5 px-3 text-xs"
            disabled={triggerSync.isPending || isSyncing(syncStatus)}
            onClick={() => triggerSync.mutate({ connectorId, type: "FULL" })}
            variant="outline"
          >
            <Icons.RefreshCw size={12} />
            Sync
          </Button>
        </div>
      )}

      <SyncStatusCard connectorId={connectorId} syncStatus={syncStatus} />
    </div>
  );
}
