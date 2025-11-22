"use client";

import { appStore } from "@openplane/integrations";
import { Icons } from "@/components/icons";
import { AppLogo } from "@/components/integrations/app-logo";
import { SyncControls } from "@/components/sync/sync-controls";
import { SyncHistoryList } from "@/components/sync/sync-history-list";
import { SyncStatusCard } from "@/components/sync/sync-status-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSyncHistory, useSyncStatus } from "@/hooks/use-sync";

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
  const { data: syncHistory, isLoading: isLoadingHistory } = useSyncHistory(
    connectorId ?? undefined,
    {
      limit: 10,
      enabled: !!connectorId,
    }
  );

  const app = appStore.find((a) => a.id === appId) ?? {
    id: appId,
    name: connectorName,
    logo: undefined,
  };

  return (
    <Sheet onOpenChange={onClose} open={!!connectorId}>
      <SheetContent className="sm:max-w-[600px]">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <AppLogo app={app} size={40} />
            <div className="flex-1">
              <SheetTitle className="text-lg">{connectorName}</SheetTitle>
              <p className="text-[#878787] text-xs">{appId}</p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)] pr-4" hideScrollbar>
          <div className="space-y-6 pt-6">
            {isLoadingSyncStatus ? (
              <div className="flex items-center justify-center py-8">
                <Icons.Loader2Icon
                  className="animate-spin text-muted-foreground"
                  size={24}
                />
              </div>
            ) : (
              <>
                <SyncStatusCard
                  connectorId={connectorId ?? ""}
                  syncStatus={syncStatus}
                />
                <SyncControls
                  connectorId={connectorId ?? ""}
                  syncStatus={syncStatus}
                />
                <SyncHistoryList
                  history={syncHistory?.history ?? []}
                  isLoading={isLoadingHistory}
                />
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
