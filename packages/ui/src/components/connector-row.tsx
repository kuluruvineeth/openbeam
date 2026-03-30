"use client";

import * as React from "react";
import { cn } from "../utils/cn";
import { formatNumber, formatRelativeTime } from "../utils/format";
import { SourceIcon } from "./source-icon";
import { StatusBadge } from "./status-badge";

type ConnectorRowProps = {
  id: string;
  name: string;
  connectorType: string;
  status: string;
  lastSyncAt?: string | null;
  documentCount: number;
  healthScore?: number;
  appLogo?: React.ReactNode;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
};

const ConnectorRow = React.forwardRef<HTMLDivElement, ConnectorRowProps>(
  (
    {
      name,
      connectorType,
      status,
      lastSyncAt,
      documentCount,
      appLogo,
      onClick,
      className,
    },
    ref
  ) => {
    const Tag = onClick ? "button" : "div";
    return (
      <Tag
        className={cn(
          "grid w-full grid-cols-[1fr_100px_100px_80px] items-center gap-3 border-border/50 border-b px-3 py-2.5 text-left text-sm",
          onClick && "cursor-pointer transition-colors hover:bg-muted/50",
          className
        )}
        onClick={onClick}
        ref={ref as React.Ref<HTMLButtonElement & HTMLDivElement>}
        type={onClick ? "button" : undefined}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {appLogo ?? <SourceIcon size={22} type={connectorType} />}
          <span className="truncate font-medium">{name}</span>
        </div>

        <StatusBadge status={status} type="connector" />

        <span className="text-muted-foreground text-xs">
          {formatRelativeTime(lastSyncAt ?? null)}
        </span>

        <span className="text-right font-mono text-muted-foreground text-xs tabular-nums">
          {formatNumber(documentCount)}
        </span>
      </Tag>
    );
  }
);
ConnectorRow.displayName = "ConnectorRow";

export { ConnectorRow };
export type { ConnectorRowProps };
