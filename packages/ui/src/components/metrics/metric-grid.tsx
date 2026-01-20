"use client";

import type { ReactNode } from "react";

import { cn } from "../../utils/cn";
import type { NumberFormat } from "./animated-number";
import { MetricCard } from "./metric-card";

interface Metric {
  id: string;
  title: string;
  value: number;
  previousValue?: number;
  format?: NumberFormat;
  icon?: ReactNode;
  description?: string;
  tooltip?: string;
}

interface MetricGridProps {
  metrics: Metric[];
  columns?: 2 | 3 | 4 | 5;
  loading?: boolean;
  className?: string;
  onMetricClick?: (id: string) => void;
}

const GRID_COLS: Record<2 | 3 | 4 | 5, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
};

function MetricGrid({
  metrics,
  columns = 4,
  loading,
  className,
  onMetricClick,
}: MetricGridProps) {
  return (
    <div className={cn("grid gap-4", GRID_COLS[columns], className)}>
      {metrics.map((metric) => (
        <MetricCard
          description={metric.description}
          format={metric.format}
          icon={metric.icon}
          key={metric.id}
          loading={loading}
          onClick={onMetricClick ? () => onMetricClick(metric.id) : undefined}
          previousValue={metric.previousValue}
          title={metric.title}
          tooltip={metric.tooltip}
          value={metric.value}
        />
      ))}
    </div>
  );
}

export { MetricGrid };
export type { Metric, MetricGridProps };
