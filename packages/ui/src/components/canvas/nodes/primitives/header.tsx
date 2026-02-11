"use client";

import type { ReactNode } from "react";
import { memo, useMemo } from "react";
import { cn } from "../../../../utils";

const STATUS_DOT_STYLES = {
  running: "bg-blue-500 animate-pulse",
  success: "bg-green-500",
  error: "bg-red-500",
  waiting: "bg-amber-400 animate-pulse",
} as const;

interface NodeHeaderProps {
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  colorVar?: string;
  badge?: ReactNode;
  statusDot?: "running" | "success" | "error" | "waiting";
}

export const NodeHeader = memo(function NodeHeaderComponent({
  icon,
  title,
  subtitle,
  actions,
  colorVar,
  badge,
  statusDot,
}: NodeHeaderProps) {
  const iconStyle = useMemo(
    () =>
      colorVar
        ? {
            backgroundColor: `color-mix(in srgb, ${colorVar} 10%, transparent)`,
            color: colorVar,
          }
        : undefined,
    [colorVar]
  );

  return (
    <div className="flex items-center gap-3 p-3">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-md text-foreground"
        style={iconStyle}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm leading-tight">{title}</p>
          {badge}
          {statusDot && (
            <span
              className={cn(
                "size-2 rounded-full",
                STATUS_DOT_STYLES[statusDot]
              )}
            />
          )}
        </div>
        {subtitle && (
          <p className="truncate text-muted-foreground text-xs">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      )}
    </div>
  );
});

NodeHeader.displayName = "NodeHeader";
