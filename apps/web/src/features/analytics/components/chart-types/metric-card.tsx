"use client";

import { cn, Icons } from "@openbeam/ui";
import { cva } from "class-variance-authority";
import {
  calculateTrendPercent,
  formatChartValue,
  formatCurrency,
  formatPercent,
} from "../../lib/chart-utils";
import type { MetricConfig, MetricTrend } from "../../types";

const trendVariants = cva("flex items-center gap-0.5 font-medium text-xs", {
  variants: {
    trend: {
      up: "text-emerald-600 dark:text-emerald-400",
      down: "text-red-600 dark:text-red-400",
      neutral: "text-muted-foreground",
    },
  },
  defaultVariants: {
    trend: "neutral",
  },
});

type MetricCardProps = {
  config: MetricConfig;
  className?: string;
};

export function MetricCard({ config, className }: MetricCardProps) {
  const formattedValue = formatMetricValue(config.value, config.format);

  const trend: MetricTrend = config.trend ?? deriveTrend(config);
  const trendPercent =
    typeof config.value === "number" && config.previousValue !== undefined
      ? calculateTrendPercent(config.value, config.previousValue)
      : null;

  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-md border border-border/50 bg-background p-4",
        className
      )}
    >
      <span className="text-muted-foreground text-xs">{config.title}</span>
      <span className="font-semibold text-2xl tabular-nums">
        {formattedValue}
      </span>
      {(trendPercent !== null || config.trendLabel) && (
        <div className={cn(trendVariants({ trend }))}>
          <TrendIcon trend={trend} />
          {trendPercent !== null && (
            <span>
              {trendPercent > 0 ? "+" : ""}
              {trendPercent.toFixed(1)}%
            </span>
          )}
          {config.trendLabel && (
            <span className="text-muted-foreground">{config.trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

function TrendIcon({ trend }: { trend: MetricTrend }) {
  if (trend === "up") {
    return <Icons.TrendingUp size={14} />;
  }
  if (trend === "down") {
    return <Icons.TrendingDown size={14} />;
  }
  return <Icons.Minus size={14} />;
}

function formatMetricValue(
  value: number | string,
  format?: MetricConfig["format"]
): string {
  if (typeof value === "string") {
    return value;
  }
  if (format === "currency") {
    return formatCurrency(value);
  }
  if (format === "percent") {
    return formatPercent(value);
  }
  return formatChartValue(value);
}

function deriveTrend(config: MetricConfig): MetricTrend {
  if (typeof config.value !== "number" || config.previousValue === undefined) {
    return "neutral";
  }
  if (config.value > config.previousValue) {
    return "up";
  }
  if (config.value < config.previousValue) {
    return "down";
  }
  return "neutral";
}
