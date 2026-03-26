"use client";

import { Skeleton } from "@openbeam/ui";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type HealthStatus = "healthy" | "degraded" | "unhealthy";

const STATUS_CONFIG: Record<
  HealthStatus,
  { label: string; className: string }
> = {
  healthy: {
    label: "Healthy",
    className: "bg-emerald-500/10 text-emerald-500",
  },
  degraded: {
    label: "Degraded",
    className: "bg-amber-500/10 text-amber-500",
  },
  unhealthy: {
    label: "Unhealthy",
    className: "bg-red-500/10 text-red-500",
  },
};

function HealthSkeleton() {
  return (
    <div className="space-y-3 rounded-md border border-border/50 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={`health-skel-${i}`}>
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="mt-1 h-4 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreBadge({
  score,
  status,
}: {
  score: number;
  status: HealthStatus;
}) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-medium font-mono text-[11px]",
        config.className
      )}
    >
      {score}
      <span className="text-[9px] opacity-60">/100</span>
    </span>
  );
}

export function CustomConnectorHealth({
  connectorId,
}: {
  connectorId: string;
}) {
  const trpc = useTRPC();

  const { data: health, isLoading } = useQuery(
    trpc.customConnectors.getHealthScore.queryOptions({
      connectorId,
    })
  );

  if (isLoading) {
    return <HealthSkeleton />;
  }

  if (!health) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-md border border-border/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icons.Heart className="text-foreground/40" size={14} />
          <span className="font-medium text-xs">Connector Health</span>
        </div>
        <ScoreBadge score={health.score} status={health.status} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-foreground/40">Documents</p>
          <p className="font-mono text-sm tabular-nums">
            {health.totalDocuments.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-foreground/40">Errors</p>
          <p className="font-mono text-sm tabular-nums">
            {health.consecutiveErrors}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-foreground/40">Last Sync</p>
          <p className="text-foreground/60 text-xs">
            {health.lastSyncAt
              ? formatDistanceToNow(new Date(health.lastSyncAt), {
                  addSuffix: true,
                })
              : "Never"}
          </p>
        </div>
      </div>

      {health.factors.length > 0 && (
        <div className="space-y-1.5 border-border/50 border-t pt-3">
          {health.factors.map((factor) => (
            <div
              className="flex items-center justify-between text-[11px]"
              key={factor.name}
            >
              <span className="text-foreground/50">{factor.name}</span>
              <div className="flex items-center gap-2">
                <div className="h-1 w-16 overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      factor.score >= 80 && "bg-emerald-500",
                      factor.score >= 50 && factor.score < 80 && "bg-amber-500",
                      factor.score < 50 && "bg-red-500"
                    )}
                    style={{ width: `${factor.score}%` }}
                  />
                </div>
                <span className="w-6 text-right font-mono text-foreground/40">
                  {factor.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
