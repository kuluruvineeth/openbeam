"use client";

import { Skeleton } from "@openbeam/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { BarChartView } from "@/features/analytics/components/chart-types/bar-chart";
import { LineChartView } from "@/features/analytics/components/chart-types/line-chart";
import { MetricCard } from "@/features/analytics/components/chart-types/metric-card";
import { useTRPC } from "@/trpc/client";

const PERIOD_OPTIONS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

export function AnalyticsDashboard() {
  const trpc = useTRPC();
  const [days, setDays] = useState(30);

  const { data: overview, isLoading: overviewLoading } = useQuery(
    trpc.dataAnalytics.overview.queryOptions({})
  );

  const { data: searchVolume, isLoading: searchLoading } = useQuery(
    trpc.dataAnalytics.searchVolume.queryOptions({ days })
  );

  const { data: aiTrend, isLoading: aiLoading } = useQuery(
    trpc.dataAnalytics.aiUsageTrend.queryOptions({ days })
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-medium text-xl">Analytics</h1>
          <p className="text-muted-foreground text-sm">
            Search volume, AI usage, and data source health.
          </p>
        </div>
        <PeriodSelector days={days} onChange={setDays} />
      </div>

      {overviewLoading ? (
        <MetricsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            config={{
              title: "Search Queries",
              value: overview?.searchCount ?? 0,
              format: "number",
            }}
          />
          <MetricCard
            config={{
              title: "AI Requests",
              value: overview?.aiRequestCount ?? 0,
              format: "number",
            }}
          />
          <MetricCard
            config={{
              title: "AI Cost",
              value: overview?.aiTotalCost ?? 0,
              format: "currency",
            }}
          />
          <MetricCard
            config={{
              title: "Documents Indexed",
              value: overview?.totalDocuments ?? 0,
              format: "number",
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-6">
          <ChartCard
            icon={<Icons.Search size={14} />}
            isLoading={searchLoading}
            title="Search Volume"
          >
            {searchVolume && searchVolume.length > 0 ? (
              <LineChartView
                config={{ xField: "date", yField: "queries" }}
                data={searchVolume}
              />
            ) : (
              <ChartEmpty />
            )}
          </ChartCard>
        </div>

        <div className="col-span-12 lg:col-span-6">
          <ChartCard
            icon={<Icons.BotIcon size={14} />}
            isLoading={aiLoading}
            title="AI Usage"
          >
            {aiTrend && aiTrend.length > 0 ? (
              <BarChartView
                config={{ xField: "date", yField: "totalCost" }}
                data={aiTrend}
              />
            ) : (
              <ChartEmpty />
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

function PeriodSelector({
  days,
  onChange,
}: {
  days: number;
  onChange: (d: number) => void;
}) {
  return (
    <div className="flex gap-1 border border-border/50 p-0.5">
      {PERIOD_OPTIONS.map((opt) => (
        <button
          className={`px-2.5 py-1 font-mono text-xs transition-colors ${
            days === opt.days
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
          key={opt.days}
          onClick={() => onChange(opt.days)}
          type="button"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  icon,
  isLoading,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  isLoading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border/50 bg-background p-6">
      <div className="mb-4 flex items-center gap-2 text-muted-foreground text-sm">
        {icon}
        {title}
      </div>
      <div className="h-64">{isLoading ? <ChartSkeleton /> : children}</div>
    </div>
  );
}

function ChartEmpty() {
  return (
    <div className="flex h-full items-center justify-center">
      <span className="text-muted-foreground text-xs">No data yet</span>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex h-full flex-col justify-end gap-1">
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton
          className={`w-full ${i % 2 === 0 ? "h-8" : "h-12"}`}
          key={`cs-${i}`}
        />
      ))}
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          className="space-y-2 border border-border/50 px-4 py-3"
          key={`ms-${i}`}
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
