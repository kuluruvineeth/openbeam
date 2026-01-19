"use client";

import type { ReactNode } from "react";

import { cn } from "../../utils/cn";
import {
  AnimatedNumber,
  type NumberFormat,
  type Trend,
} from "./animated-number";
import { Sparkline } from "./sparkline";

interface MetricCardWithSparklineProps {
  title: string;
  value: number;
  data: number[];
  format?: NumberFormat;
  trend?: Trend;
  icon?: ReactNode;
  className?: string;
}

function getSparklineColor(trend?: Trend): string {
  if (trend === "up") {
    return "rgb(16, 185, 129)";
  }
  if (trend === "down") {
    return "rgb(239, 68, 68)";
  }
  return "rgb(156, 163, 175)";
}

function MetricCardWithSparkline({
  title,
  value,
  data,
  format = "number",
  trend,
  icon,
  className,
}: MetricCardWithSparklineProps) {
  const sparklineColor = getSparklineColor(trend);

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-card p-4",
        "transition-colors hover:border-border/80",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <div className="rounded-md bg-muted p-1.5">{icon}</div>}
          <span className="text-muted-foreground text-sm">{title}</span>
        </div>
        <AnimatedNumber
          className="font-semibold text-lg"
          format={format}
          trend={trend}
          value={value}
        />
      </div>

      <div className="mt-3">
        <Sparkline color={sparklineColor} data={data} height={40} width={200} />
      </div>
    </div>
  );
}

export { MetricCardWithSparkline };
export type { MetricCardWithSparklineProps };
