"use client";

import { appStore } from "@openplane/integrations";
import { SyncSettingsForm } from "@/components/forms/sync-settings-form";
import { Icons } from "@/components/icons";
import { AppLogo } from "@/components/integrations/app-logo";
import { SyncHistoryList } from "@/components/sync/sync-history-list";
import { SyncStatusCard } from "@/components/sync/sync-status-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSyncHistoryInfinite, useSyncStatus } from "@/hooks/use-sync";

type DataSourceDetailsSheetProps = {
  connectorId: string | null;
  connectorName: string;
  appId: string;
  onClose: () => void;
};

export function DataSourceDetailsSheet({
  connectorId,
  connectorName,
  appId,
  onClose,
}: DataSourceDetailsSheetProps) {
  const { data: syncStatus, isLoading: isLoadingSyncStatus } = useSyncStatus(
    connectorId ?? undefined,
    {
      enabled: !!connectorId,
    }
  );
  const {
    data: syncHistory,
    isLoading: isLoadingHistory,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSyncHistoryInfinite(connectorId ?? undefined, {
    limit: 10,
    enabled: !!connectorId,
  });

  const app = appStore.find((a) => a.id === appId);

  return (
    <Sheet onOpenChange={onClose} open={!!connectorId}>
      <SheetContent className="sm:max-w-[600px]">
        <SheetHeader>
          <div className="flex items-center gap-3">
            {app && <AppLogo app={app} size={40} />}
            <div className="flex-1">
              <SheetTitle className="text-lg">{connectorName}</SheetTitle>
              <p className="text-[#878787] text-xs">{appId}</p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)] pr-4" hideScrollbar>
          <div className="pt-6">
            {isLoadingSyncStatus ? (
              <div className="flex items-center justify-center py-8">
                <Icons.Loader2Icon
                  className="animate-spin text-muted-foreground"
                  size={24}
                />
              </div>
            ) : (
              <Tabs className="w-full" defaultValue="overview">
                <TabsList className="w-full">
                  <TabsTrigger className="flex-1" value="overview">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger className="flex-1" value="settings">
                    Settings
                  </TabsTrigger>
                </TabsList>

                <TabsContent className="mt-6 space-y-6" value="overview">
                  <SyncStatusCard
                    connectorId={connectorId ?? ""}
                    syncStatus={syncStatus}
                  />
                  <SyncHistoryList
                    data={syncHistory}
                    fetchNextPage={fetchNextPage}
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    isLoading={isLoadingHistory}
                  />
                </TabsContent>

                <TabsContent className="mt-6" value="settings">
                  <SyncSettingsForm
                    connectorId={connectorId ?? ""}
                    fullSyncJob={syncStatus?.syncJobs?.full ?? null}
                    incrementalSyncJob={
                      syncStatus?.syncJobs?.incremental ?? null
                    }
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
