"use client";

import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string | number;
  detail?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
};

export function MetricCard({
  label,
  value,
  detail,
  className,
}: MetricCardProps) {
  return (
    <div className={cn("rounded-sm border border-border/50 p-4", className)}>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-semibold text-2xl tabular-nums">{value}</p>
      {detail && (
        <p className="mt-0.5 text-muted-foreground text-xs">{detail}</p>
      )}
    </div>
  );
}
