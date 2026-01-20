"use client";

import type { ReactNode } from "react";
import { memo } from "react";
import { cn } from "../../../../utils";

interface NodeHeaderProps {
  icon: ReactNode;
  title: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  colorVar?: string;
}

export const NodeHeader = memo(function NodeHeaderComponent({
  icon,
  title,
  subtitle,
  actions,
  colorVar,
}: NodeHeaderProps) {
  return (
    <div className="flex items-center gap-3 p-3">
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md",
          "bg-muted text-muted-foreground"
        )}
        style={
          colorVar
            ? {
                backgroundColor: `hsl(var(${colorVar}) / 0.15)`,
                color: `hsl(var(${colorVar}))`,
              }
            : undefined
        }
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm leading-tight">{title}</p>
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
