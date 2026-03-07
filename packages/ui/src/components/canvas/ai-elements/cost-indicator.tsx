"use client";

import type { TokenUsage } from "@openbeam/types/canvas";
import { cva } from "class-variance-authority";
import { forwardRef, memo } from "react";
import { cn } from "../../../utils";
import { Icons } from "../../icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../tooltip";

const costBadgeStyles = cva(
  "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-[10px] tabular-nums",
  {
    variants: {
      level: {
        low: "bg-green-500/10 text-green-600 dark:text-green-400",
        medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        high: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
        veryHigh: "bg-red-500/10 text-red-600 dark:text-red-400",
      },
    },
    defaultVariants: {
      level: "low",
    },
  }
);

function getCostLevel(cost: number): "low" | "medium" | "high" | "veryHigh" {
  if (cost < 0.001) {
    return "low";
  }
  if (cost < 0.01) {
    return "medium";
  }
  if (cost < 0.1) {
    return "high";
  }
  return "veryHigh";
}

function formatCost(cost: number): string {
  if (cost < 0.0001) {
    return "<$0.0001";
  }
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  if (cost < 1) {
    return `$${cost.toFixed(3)}`;
  }
  return `$${cost.toFixed(2)}`;
}

function formatTokens(count: number): string {
  if (count < 1000) {
    return count.toString();
  }
  if (count < 1_000_000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return `${(count / 1_000_000).toFixed(2)}M`;
}

export interface CostIndicatorProps {
  usage?: TokenUsage;
  showTokens?: boolean;
  showCost?: boolean;
  compact?: boolean;
  className?: string;
}

export const CostIndicator = memo(
  forwardRef<HTMLDivElement, CostIndicatorProps>(
    function CostIndicatorComponent(
      { usage, showTokens = true, showCost = true, compact = false, className },
      ref
    ) {
      if (!usage) {
        return null;
      }

      const level = getCostLevel(usage.estimatedCost);

      if (compact) {
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(costBadgeStyles({ level }), className)}
                ref={ref}
              >
                <Icons.Coins size={12} />
                <span>{formatCost(usage.estimatedCost)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Input:</span>
                  <span className="tabular-nums">
                    {formatTokens(usage.input)} tokens
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Output:</span>
                  <span className="tabular-nums">
                    {formatTokens(usage.output)} tokens
                  </span>
                </div>
                <div className="border-t pt-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="tabular-nums">
                      {formatTokens(usage.total)} tokens
                    </span>
                  </div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      }

      return (
        <div
          className={cn(
            "flex items-center gap-3 text-muted-foreground text-xs",
            className
          )}
          ref={ref}
        >
          {showTokens && (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1">
                <Icons.TrendingDown className="text-blue-500" size={12} />
                <span className="tabular-nums">
                  {formatTokens(usage.input)}
                </span>
              </div>
              <span className="text-muted-foreground/50">/</span>
              <div className="flex items-center gap-1">
                <Icons.TrendingUp className="text-purple-500" size={12} />
                <span className="tabular-nums">
                  {formatTokens(usage.output)}
                </span>
              </div>
            </div>
          )}
          {showCost && (
            <div className={cn(costBadgeStyles({ level }))}>
              <Icons.Coins size={12} />
              <span>{formatCost(usage.estimatedCost)}</span>
            </div>
          )}
        </div>
      );
    }
  )
);

CostIndicator.displayName = "CostIndicator";
