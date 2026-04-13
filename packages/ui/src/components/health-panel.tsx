"use client";

import { cva } from "class-variance-authority";
import { cn } from "../utils/cn";

const healthIndicatorVariants = cva("inline-flex h-2 w-2 rounded-full", {
  variants: {
    status: {
      healthy: "bg-emerald-500",
      degraded: "bg-amber-500",
      unhealthy: "bg-red-500",
      unknown: "bg-muted-foreground/50",
    },
  },
  defaultVariants: {
    status: "unknown",
  },
});

type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

type HealthItem = {
  label: string;
  status: HealthStatus;
  detail?: string;
};

type HealthPanelProps = {
  items: HealthItem[];
  title?: string;
  compact?: boolean;
  className?: string;
};

function HealthPanel({ items, title, compact, className }: HealthPanelProps) {
  const healthy = items.filter((i) => i.status === "healthy").length;
  const total = items.length;

  return (
    <div className={cn("rounded-md border border-border/50 p-3", className)}>
      {title && (
        <div className="mb-2 flex items-center justify-between">
          <span className="font-medium text-sm">{title}</span>
          <span className="text-muted-foreground text-xs">
            {healthy}/{total} healthy
          </span>
        </div>
      )}
      <div className={cn("flex flex-col gap-1.5", compact && "gap-1")}>
        {items.map((item) => (
          <div className="flex items-center gap-2" key={item.label}>
            <span
              className={healthIndicatorVariants({ status: item.status })}
            />
            <span className="text-sm">{item.label}</span>
            {item.detail && (
              <span className="ml-auto text-muted-foreground text-xs">
                {item.detail}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export { HealthPanel, healthIndicatorVariants };
export type { HealthItem, HealthPanelProps, HealthStatus };
