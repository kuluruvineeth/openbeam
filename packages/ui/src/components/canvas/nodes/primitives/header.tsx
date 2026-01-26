"use client";

import type { ReactNode } from "react";
import { memo } from "react";

interface NodeHeaderProps {
  icon: ReactNode;
  title: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  colorVar?: string;
  badge?: ReactNode;
}

export const NodeHeader = memo(function NodeHeaderComponent({
  icon,
  title,
  subtitle,
  actions,
  badge,
}: NodeHeaderProps) {
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="flex size-9 shrink-0 items-center justify-center text-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm leading-tight">{title}</p>
          {badge}
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
