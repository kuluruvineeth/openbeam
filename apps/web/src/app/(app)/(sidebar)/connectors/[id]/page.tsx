"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type Connector = {
  id: string;
  name: string;
  type: string;
  status: "connected" | "syncing" | "error" | "disconnected";
  lastSyncAt?: Date;
  documentCount?: number;
  errorMessage?: string;
  config?: Record<string, unknown>;
  syncHistory?: Array<{
    id: string;
    status: "success" | "failed";
    startedAt: Date;
    documentsProcessed: number;
  }>;
};

export default function ConnectorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const connectorId = params.id as string;

  const {
    data: connector,
    isLoading,
    error,
  } = useQuery(trpc.connectors.get.queryOptions({ connectorId }));

  const syncMutation = useMutation(
    trpc.connectors.sync.mutationOptions({
      onSuccess: () => {
        toast.success("Sync started");
        queryClient.invalidateQueries({
          queryKey: trpc.connectors.get.queryOptions({ connectorId }).queryKey,
        });
      },
      onError: () => {
        toast.error("Failed to start sync");
      },
    })
  );

  const disconnectMutation = useMutation(
    trpc.connectors.disconnect.mutationOptions({
      onSuccess: () => {
        toast.success("Connector disconnected");
        router.push("/connectors");
      },
      onError: () => {
        toast.error("Failed to disconnect");
      },
    })
  );

  if (error) {
    return (
      <div className="flex h-[calc(100vh-140px)] flex-col items-center justify-center">
        <Icons.AlertCircle className="mb-4 text-destructive" size={32} />
        <h3 className="mb-2 font-medium text-foreground">
          Connector not found
        </h3>
        <Button onClick={() => router.push("/connectors")} variant="outline">
          Back to connectors
        </Button>
      </div>
    );
  }

  const conn = connector as Connector | undefined;

  return (
    <div className="mx-auto max-w-4xl py-6">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            onClick={() => router.push("/connectors")}
            size="icon"
            variant="ghost"
          >
            <Icons.ArrowLeft size={18} />
          </Button>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center bg-muted">
                <Icons.ConnectorIcon size={28} />
              </div>
              <div>
                <h1 className="mb-1 font-f37-stout text-xl">
                  {conn?.name || "Connector"}
                </h1>
                <div className="flex items-center gap-3 text-muted-foreground text-sm">
                  <span className="capitalize">{conn?.type}</span>
                  {conn?.status && (
                    <>
                      <span>•</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 text-xs capitalize",
                          conn.status === "connected" &&
                            "bg-green-500/10 text-green-500",
                          conn.status === "syncing" &&
                            "bg-blue-500/10 text-blue-500",
                          conn.status === "error" &&
                            "bg-red-500/10 text-red-500"
                        )}
                      >
                        {conn.status}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            disabled={syncMutation.isPending || conn?.status === "syncing"}
            onClick={() => syncMutation.mutate({ connectorId })}
            variant="outline"
          >
            {syncMutation.isPending || conn?.status === "syncing" ? (
              <>
                <Icons.Spinner className="mr-2 animate-spin" size={16} />
                Syncing...
              </>
            ) : (
              <>
                <Icons.RefreshCw className="mr-2" size={16} />
                Sync Now
              </>
            )}
          </Button>
          <Button
            onClick={() => disconnectMutation.mutate({ connectorId })}
            variant="destructive"
          >
            Disconnect
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="border border-border bg-background p-4">
          <p className="mb-1 text-muted-foreground text-sm">Documents</p>
          <p className="font-f37-stout text-2xl">
            {conn?.documentCount?.toLocaleString() || "0"}
          </p>
        </div>
        <div className="border border-border bg-background p-4">
          <p className="mb-1 text-muted-foreground text-sm">Last Synced</p>
          <p className="font-f37-stout text-2xl">
            {conn?.lastSyncAt
              ? new Date(conn.lastSyncAt).toLocaleDateString()
              : "Never"}
          </p>
        </div>
        <div className="border border-border bg-background p-4">
          <p className="mb-1 text-muted-foreground text-sm">Status</p>
          <p className="font-f37-stout text-2xl capitalize">
            {conn?.status || "Unknown"}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {conn?.errorMessage && (
        <div className="mb-8 border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-center gap-2 text-red-500">
            <Icons.AlertCircle size={16} />
            <p className="font-medium">Sync Error</p>
          </div>
          <p className="mt-2 text-red-500 text-sm">{conn.errorMessage}</p>
        </div>
      )}

      {/* Sync History */}
      <section>
        <h2 className="mb-4 font-medium text-foreground">Sync History</h2>
        <div className="border border-border bg-background">
          {!conn?.syncHistory || conn.syncHistory.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No sync history available
            </div>
          ) : (
            conn.syncHistory.map((sync) => (
              <div
                className="flex items-center justify-between border-border border-b p-4 last:border-b-0"
                key={sync.id}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center",
                      sync.status === "success"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-red-500/10 text-red-500"
                    )}
                  >
                    {sync.status === "success" ? (
                      <Icons.CheckIcon size={16} />
                    ) : (
                      <Icons.XIcon size={16} />
                    )}
                  </div>
                  <div>
                    <p className="text-foreground text-sm">
                      {sync.startedAt.toLocaleString()}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {sync.documentsProcessed} documents processed
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
