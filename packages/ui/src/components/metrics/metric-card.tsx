"use client";

import type { ReactNode } from "react";

import { cn } from "../../utils/cn";
import { Icons } from "../icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../tooltip";
import type { NumberFormat, Trend } from "./animated-number";
import { AnimatedNumber } from "./animated-number";

interface MetricCardProps {
  title: string;
  value: number;
  previousValue?: number;
  format?: NumberFormat;
  icon?: ReactNode;
  description?: string;
  tooltip?: string;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

function getTrendFromChange(change: number): Trend {
  if (change > 0) {
    return "up";
  }
  if (change < 0) {
    return "down";
  }
  return "neutral";
}

function calculateTrend(
  value: number,
  previousValue?: number
): { change: number | undefined; trend: Trend | undefined } {
  if (previousValue === undefined) {
    return { change: undefined, trend: undefined };
  }
  const change = ((value - previousValue) / previousValue) * 100;
  const trend = getTrendFromChange(change);
  return { change, trend };
}

function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-md border border-border bg-card p-4", className)}
    >
      <div className="space-y-3">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function MetricCardContent({
  title,
  value,
  previousValue,
  format = "number",
  icon,
  description,
  tooltip,
}: Omit<MetricCardProps, "loading" | "className" | "onClick">) {
  const { change, trend } = calculateTrend(value, previousValue);

  return (
    <>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {icon && <div className="rounded-md bg-muted p-2">{icon}</div>}
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground text-sm">{title}</span>
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Icons.Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>{tooltip}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-xs",
              trend === "up" && "bg-emerald-500/10 text-emerald-600",
              trend === "down" && "bg-red-500/10 text-red-600",
              trend === "neutral" && "bg-muted text-muted-foreground"
            )}
          >
            {trend === "up" && <Icons.TrendingUp className="h-3 w-3" />}
            {trend === "down" && <Icons.TrendingDown className="h-3 w-3" />}
            {trend === "neutral" && <Icons.Minus className="h-3 w-3" />}
            <AnimatedNumber
              decimals={1}
              format="percent"
              value={Math.abs(change) / 100}
            />
          </div>
        )}
      </div>

      <div className="mt-3">
        <AnimatedNumber
          className="font-semibold text-2xl"
          format={format}
          value={value}
        />
      </div>

      {description && (
        <p className="mt-1 text-muted-foreground text-xs">{description}</p>
      )}
    </>
  );
}

function MetricCard({
  title,
  value,
  previousValue,
  format = "number",
  icon,
  description,
  tooltip,
  loading,
  className,
  onClick,
}: MetricCardProps) {
  if (loading) {
    return <MetricCardSkeleton className={className} />;
  }

  const baseClassName = cn(
    "rounded-md border border-border bg-card p-4",
    "transition-colors hover:border-border/80",
    className
  );

  const contentProps = {
    title,
    value,
    previousValue,
    format,
    icon,
    description,
    tooltip,
  };

  if (onClick) {
    return (
      <button
        className={cn(baseClassName, "w-full cursor-pointer text-left")}
        onClick={onClick}
        type="button"
      >
        <MetricCardContent {...contentProps} />
      </button>
    );
  }

  return (
    <div className={baseClassName}>
      <MetricCardContent {...contentProps} />
    </div>
  );
}

export { MetricCard, MetricCardSkeleton };
export type { MetricCardProps };
