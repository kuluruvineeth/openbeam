"use client";

import { Badge, Skeleton } from "@openbeam/ui";
import { useQuery } from "@tanstack/react-query";
import { Icons } from "@/components/icons";
import { useTRPC } from "@/trpc/client";

export function ConnectorAdmin() {
  const trpc = useTRPC();
  const { data: connectors, isLoading } = useQuery(
    trpc.admin.connectors.list.queryOptions()
  );

  if (isLoading) {
    return <ConnectorsSkeleton />;
  }

  return (
    <div className="rounded-sm border border-border/50">
      <div className="flex items-center gap-4 border-border/50 border-b bg-foreground/3 px-4 py-2 font-mono text-[10px] text-muted-foreground uppercase">
        <span className="flex-1">Connector</span>
        <span className="w-20">Status</span>
        <span className="w-20 text-right">Documents</span>
      </div>
      {(connectors ?? []).map((c) => (
        <div
          className="flex items-center gap-4 border-border/50 border-b px-4 py-2.5 last:border-b-0"
          key={c.id}
        >
          <div className="flex flex-1 items-center gap-3">
            <Icons.Link className="shrink-0 text-muted-foreground" size={14} />
            <span className="text-sm">{c.name ?? c.app}</span>
          </div>
          <div className="w-20">
            <StatusBadge status={c.status} />
          </div>
          <div className="w-20 text-right font-mono text-muted-foreground text-xs tabular-nums">
            {c.totalDocuments?.toLocaleString() ?? "—"}
          </div>
        </div>
      ))}
      {(connectors ?? []).length === 0 && (
        <div className="px-4 py-8 text-center text-muted-foreground text-sm">
          No connectors configured
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "ACTIVE" ? "default" : "outline";
  return (
    <Badge className="font-mono text-[10px]" variant={variant}>
      {status}
    </Badge>
  );
}

function ConnectorsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }, (_, i) => (
        <div className="flex items-center gap-3 px-4 py-2" key={`cs-${i}`}>
          <Skeleton className="size-5" />
          <Skeleton className="h-3.5 w-32 flex-1" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}
