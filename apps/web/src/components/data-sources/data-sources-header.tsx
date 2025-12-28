"use client";

import Link from "next/link";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDataSourcesStats } from "@/hooks/use-data-sources";
import { cn } from "@/lib/utils";

export function DataSourcesHeader() {
  const { data: stats, isLoading } = useDataSourcesStats();

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">
            Data Sources
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage all your connected data sources and sync operations
          </p>
        </div>
        <Link href="/connectors?tab=available">
          <Button variant="outline">
            <Icons.Plus className="mr-2" size={16} />
            Add Data Source
          </Button>
        </Link>
      </div>

      {!isLoading && stats && (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard
            icon={Icons.Integrations}
            label="Total Sources"
            value={stats.totalConnectors}
          />
          <StatCard
            icon={Icons.CheckIcon}
            label="Active"
            value={stats.activeConnectors}
            variant="success"
          />
          <StatCard
            icon={Icons.Loader2Icon}
            label="Syncing"
            value={stats.syncingConnectors}
            variant="info"
          />
          <StatCard
            icon={Icons.FileIcon}
            label="Documents Indexed"
            value={stats.totalDocuments.toLocaleString()}
          />
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  variant = "default",
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number | string;
  variant?: "default" | "success" | "info";
}) {
  return (
    <Card
      className={cn(
        "p-4",
        variant === "success" && "border-green-200 dark:border-green-900",
        variant === "info" && "border-blue-200 dark:border-blue-900"
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="mt-1 font-semibold text-2xl">{value}</p>
        </div>
        <div className="flex size-10 items-center justify-center bg-secondary">
          <Icon className="text-muted-foreground" size={20} />
        </div>
      </div>
    </Card>
  );
}
