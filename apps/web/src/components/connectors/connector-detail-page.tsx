"use client";

import { appStore } from "@openplane/integrations";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { AppLogo } from "@/components/integrations/app-logo";
import { SyncStatusBadge } from "@/components/sync/sync-status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useConnector } from "@/hooks/use-connector";
import { useRestoreConnector } from "@/hooks/use-connectors";
import { useSyncStatus } from "@/hooks/use-sync";
import { useIsAdmin } from "@/hooks/use-user-role";
import { ConnectorDetailTabs } from "./connector-detail-tabs";
import { DeletionWarningBanner } from "./deletion-warning-banner";

type ConnectorDetailPageProps = {
  connectorId: string;
};

function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-foreground/50 text-sm">
        <Skeleton className="h-4 w-20" />
        <span>/</span>
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="size-12 rounded-lg" />
          <div>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function ConnectorNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-[calc(100vh-400px)] flex-col items-center justify-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-border/60 bg-background">
        <Icons.AlertCircle className="text-foreground/40" size={24} />
      </div>
      <h3 className="font-medium text-foreground text-lg">
        Connector not found
      </h3>
      <p className="mt-2 max-w-md text-center text-foreground/50 text-sm">
        The connector you're looking for doesn't exist or you don't have access
        to it.
      </p>
      <Button className="mt-4" onClick={onBack} variant="outline">
        Back to Connectors
      </Button>
    </div>
  );
}

function LastSyncedText({
  lastSyncedAt,
}: {
  lastSyncedAt: string | Date | null;
}) {
  if (!lastSyncedAt) {
    return <>Never synced</>;
  }
  const date =
    typeof lastSyncedAt === "string" ? new Date(lastSyncedAt) : lastSyncedAt;
  return <>Last synced {formatDistanceToNow(date, { addSuffix: true })}</>;
}

function useConnectorInfo(
  connector: NonNullable<ReturnType<typeof useConnector>["data"]>,
  syncStatus: ReturnType<typeof useSyncStatus>["data"]
) {
  const appDefinition =
    connector.definition ??
    appStore.find(
      (a) => a.id.toUpperCase() === String(connector.app).toUpperCase()
    );

  const displayName = connector.name || appDefinition?.name || "Connector";
  const appName = appDefinition?.name || connector.app || "Connector";
  const appId = appDefinition?.id || connector.app;

  const connectorStatus =
    syncStatus?.connector?.status || connector.status || "ACTIVE";
  const lastSyncedAt =
    syncStatus?.connector?.lastSyncedAt || connector.lastSyncedAt;
  const isDeleting = connectorStatus === "DELETING";
  const scheduledDeletionAt = syncStatus?.connector?.scheduledDeletionAt;

  return {
    displayName,
    appName,
    appId,
    connectorStatus,
    lastSyncedAt,
    isDeleting,
    scheduledDeletionAt,
    appDefinition,
  };
}

export function ConnectorDetailPage({ connectorId }: ConnectorDetailPageProps) {
  const router = useRouter();
  const { data: connector, isLoading } = useConnector(connectorId);
  const { data: syncStatus } = useSyncStatus(connectorId, {
    enabled: !!connectorId,
  });
  const restoreMutation = useRestoreConnector();
  const { isAdmin, isLoading: isRoleLoading } = useIsAdmin();

  if (isLoading || isRoleLoading) {
    return <DetailPageSkeleton />;
  }

  if (!connector) {
    return <ConnectorNotFound onBack={() => router.push("/connectors")} />;
  }

  return (
    <ConnectorDetailContent
      connector={connector}
      connectorId={connectorId}
      isAdmin={isAdmin}
      onBack={() => router.back()}
      restoreMutation={restoreMutation}
      syncStatus={syncStatus}
    />
  );
}

function ConnectorDetailContent({
  connector,
  connectorId,
  syncStatus,
  isAdmin,
  restoreMutation,
  onBack,
}: {
  connector: NonNullable<ReturnType<typeof useConnector>["data"]>;
  connectorId: string;
  syncStatus: ReturnType<typeof useSyncStatus>["data"];
  isAdmin: boolean;
  restoreMutation: ReturnType<typeof useRestoreConnector>;
  onBack: () => void;
}) {
  const info = useConnectorInfo(connector, syncStatus);

  return (
    <div className="space-y-6">
      {info.isDeleting && info.scheduledDeletionAt && (
        <DeletionWarningBanner
          canRestore={isAdmin}
          isRestoring={restoreMutation.isPending}
          onCancel={() => restoreMutation.mutate(connectorId)}
          scheduledDeletionAt={new Date(info.scheduledDeletionAt)}
        />
      )}

      <nav className="flex items-center gap-2 text-sm">
        <Link
          className="text-foreground/50 transition-colors hover:text-foreground"
          href="/connectors"
        >
          Connectors
        </Link>
        <span className="text-foreground/30">/</span>
        <span className="text-foreground">{info.appName}</span>
      </nav>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {info.appDefinition && (
            <div className="flex size-12 items-center justify-center rounded-lg border border-border/50 bg-background">
              <AppLogo app={info.appDefinition} size={32} />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-semibold text-2xl tracking-tight">
                {info.displayName}
              </h1>
              <SyncStatusBadge
                data={{
                  status: info.connectorStatus as
                    | "SYNCING"
                    | "ACTIVE"
                    | "ERROR"
                    | "INACTIVE"
                    | "CONNECTING"
                    | "DELETING",
                  totalIndexed: syncStatus?.stats?.totalIndexed ?? 0,
                  lastSyncedAt: info.lastSyncedAt ?? null,
                  error: syncStatus?.connector?.lastError ?? null,
                }}
                variant="compact"
              />
            </div>
            <p className="mt-1 text-foreground/50 text-sm">
              <LastSyncedText lastSyncedAt={info.lastSyncedAt ?? null} />
              {info.appId && (
                <>
                  <span className="mx-2 text-foreground/20">·</span>
                  <span className="font-mono text-xs">{info.appId}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <Button onClick={onBack} size="sm" variant="ghost">
          <Icons.ArrowLeft className="mr-1.5" size={14} />
          Back
        </Button>
      </div>

      <ConnectorDetailTabs connectorId={connectorId} syncStatus={syncStatus} />
    </div>
  );
}
