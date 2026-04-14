"use client";

import { Skeleton } from "@openbeam/ui";
import { useQuery } from "@tanstack/react-query";
import { Icons } from "@/components/icons";
import { useTRPC } from "@/trpc/client";

export function AdminDashboard() {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.admin.dashboard.metrics.queryOptions()
  );

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          icon={<Icons.Link size={14} />}
          label="Connectors"
          sub={`${data.activeConnectorCount} active`}
          value={data.connectorCount}
        />
        <MetricCard
          icon={<Icons.FileIcon size={14} />}
          label="Documents"
          value={data.documentCount}
        />
        <MetricCard
          icon={<Icons.Users size={14} />}
          label="Members"
          value={data.memberCount}
        />
        <MetricCard
          icon={<Icons.Tags size={14} />}
          label="Entities"
          value={data.entityCount}
        />
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="space-y-1 border border-border/50 px-4 py-3">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        {icon}
        {label}
      </div>
      <div className="font-medium text-2xl tabular-nums">
        {value.toLocaleString()}
      </div>
      {sub && <div className="text-muted-foreground text-xs">{sub}</div>}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          className="space-y-2 border border-border/50 px-4 py-3"
          key={`ds-${i}`}
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
