"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
};

function ConnectorCard({ connector }: { connector: Connector }) {
  const getStatusColor = () => {
    switch (connector.status) {
      case "connected":
        return "bg-green-500/10 text-green-500";
      case "syncing":
        return "bg-blue-500/10 text-blue-500";
      case "error":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Link
      className="group flex items-center justify-between border border-border bg-background p-4 transition-colors hover:border-primary/50"
      href={`/connectors/${connector.id}`}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center bg-muted">
          <Icons.ConnectorIcon size={24} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground group-hover:text-primary">
              {connector.name}
            </h3>
            <span
              className={cn("px-2 py-0.5 text-xs capitalize", getStatusColor())}
            >
              {connector.status}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-muted-foreground text-xs">
            <span className="capitalize">{connector.type}</span>
            {connector.documentCount !== undefined && (
              <>
                <span>•</span>
                <span>{connector.documentCount.toLocaleString()} docs</span>
              </>
            )}
            {connector.lastSyncAt && (
              <>
                <span>•</span>
                <span>
                  Last synced {connector.lastSyncAt.toLocaleDateString()}
                </span>
              </>
            )}
          </div>
          {connector.errorMessage && (
            <p className="mt-1 text-red-500 text-xs">
              {connector.errorMessage}
            </p>
          )}
        </div>
      </div>
      <Icons.ArrowRight
        className="text-muted-foreground group-hover:text-primary"
        size={18}
      />
    </Link>
  );
}

function ConnectorSkeleton() {
  return (
    <div className="flex items-center justify-between border border-border bg-background p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
    </div>
  );
}

export default function ConnectorsPage() {
  const router = useRouter();
  const trpc = useTRPC();

  const { data, isLoading, error } = useQuery(
    trpc.connectors.list.queryOptions()
  );

  const connectors = (data?.connectors || []) as Connector[];

  return (
    <div className="mx-auto max-w-4xl py-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-f37-stout text-xl">Connectors</h1>
          <p className="text-muted-foreground text-sm">
            Manage your data source connections
          </p>
        </div>
        <Button onClick={() => router.push("/connectors/add")}>
          <Icons.Plus className="mr-2" size={16} />
          Add Connector
        </Button>
      </div>

      {/* Connectors List */}
      <div className="space-y-3">
        {isLoading && (
          <>
            <ConnectorSkeleton />
            <ConnectorSkeleton />
            <ConnectorSkeleton />
          </>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Icons.AlertCircle className="mb-4 text-destructive" size={32} />
            <h3 className="mb-2 font-medium text-foreground">
              Failed to load connectors
            </h3>
            <p className="text-muted-foreground text-sm">
              Something went wrong. Please try again.
            </p>
          </div>
        )}

        {!(isLoading || error) && connectors.length === 0 && (
          <div className="flex flex-col items-center justify-center border border-border border-dashed py-16 text-center">
            <Icons.ConnectorIcon
              className="mb-4 text-muted-foreground"
              size={32}
            />
            <h3 className="mb-2 font-medium text-foreground">No connectors</h3>
            <p className="mb-4 text-muted-foreground text-sm">
              Connect your first data source to start indexing
            </p>
            <Button onClick={() => router.push("/connectors/add")}>
              Add Connector
            </Button>
          </div>
        )}

        {!(isLoading || error) &&
          connectors.length > 0 &&
          connectors.map((connector) => (
            <ConnectorCard connector={connector} key={connector.id} />
          ))}
      </div>
    </div>
  );
}
