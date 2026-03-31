"use client";

import { appStore } from "@openbeam/integrations";
import { formatDistanceToNow } from "date-fns";
import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "../utils/cn";
import { AppLogo } from "./app-logo";
import { Checkbox } from "./checkbox";
import { SyncStatusBadge } from "./sync-status-badge";
import { TableCell, TableRow } from "./table";

export type ConnectorData = {
  id: string;
  name: string;
  app: string;
  status: string;
  lastSyncedAt: string | Date | null;
  syncStatus: {
    connector: {
      id: string;
      status: string | null;
      lastSyncedAt: string | Date | null;
      lastError: string | null;
    };
    stats: {
      totalIndexed: number;
    };
  } | null;
};

type SharedTableRowProps = {
  connector: ConnectorData;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onRowClick: (connector: ConnectorData) => void;
  showHoverActions?: boolean;
  actions?: ReactNode;
};

export function SharedTableRow({
  connector,
  isSelected,
  onSelect,
  onRowClick,
  showHoverActions = true,
  actions,
}: SharedTableRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const app = appStore.find((a) => a.id === connector.app);
  const docs = connector.syncStatus?.stats.totalIndexed ?? 0;

  return (
    <TableRow
      className={cn(
        "group cursor-pointer transition-colors",
        "hover:bg-foreground/2",
        isSelected && "bg-foreground/3"
      )}
      onClick={(e) => {
        if (
          (e.target as HTMLElement).closest('[data-slot="checkbox"], button')
        ) {
          return;
        }
        onRowClick(connector);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          className="size-3.5"
          onCheckedChange={(checked) =>
            onSelect(connector.id, checked === true)
          }
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2.5">
          {app ? <AppLogo app={app} size={28} /> : <div className="size-7" />}
          <div className="min-w-0">
            <p className="truncate text-[13px] text-foreground/90">
              {connector.name}
            </p>
            <p className="text-[10px] text-foreground/40 uppercase tracking-wide">
              {connector.app}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {connector.syncStatus && (
          <SyncStatusBadge
            data={{
              status: (connector.syncStatus.connector.status || "ACTIVE") as
                | "SYNCING"
                | "ACTIVE"
                | "ERROR"
                | "INACTIVE"
                | "CONNECTING",
              totalIndexed: docs,
            }}
          />
        )}
      </TableCell>
      <TableCell>
        <span className="text-[11px] text-foreground/50">
          {connector.lastSyncedAt
            ? formatDistanceToNow(new Date(connector.lastSyncedAt), {
                addSuffix: true,
              })
            : "Never"}
        </span>
      </TableCell>
      <TableCell>
        <span className="font-mono text-[13px] text-foreground/70 tabular-nums">
          {docs.toLocaleString()}
        </span>
      </TableCell>
      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
        <div
          className={cn(
            "transition-opacity",
            showHoverActions && !isHovered && "opacity-0"
          )}
        >
          {actions}
        </div>
      </TableCell>
    </TableRow>
  );
}
