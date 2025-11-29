"use client";

import { appStore } from "@openplane/integrations";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { AppLogo } from "@/components/integrations/app-logo";
import { SyncStatusBadge } from "@/components/sync/sync-status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ConnectorActions } from "./connector-actions";

type ConnectorData = {
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
};

export function SharedTableRow({
  connector,
  isSelected,
  onSelect,
  onRowClick,
  showHoverActions = true,
}: SharedTableRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const app = appStore.find((a) => a.id === connector.app);

  return (
    <TableRow
      className={cn(
        "cursor-pointer transition-all duration-150",
        "hover:bg-foreground/[0.02]",
        isSelected && "bg-primary/5"
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
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          className="cursor-pointer"
          onCheckedChange={(checked) =>
            onSelect(connector.id, checked === true)
          }
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          {app ? <AppLogo app={app} size={32} /> : <div className="h-8 w-8" />}
          <div>
            <p className="font-medium text-sm">{connector.name}</p>
            <p className="text-foreground/50 text-xs">{connector.app}</p>
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
              totalIndexed: connector.syncStatus.stats.totalIndexed,
              lastSyncedAt: connector.syncStatus.connector.lastSyncedAt,
              error: connector.syncStatus.connector.lastError,
            }}
            variant="compact"
          />
        )}
      </TableCell>
      <TableCell>
        {connector.lastSyncedAt ? (
          <span className="text-foreground/60 text-xs">
            {formatDistanceToNow(new Date(connector.lastSyncedAt), {
              addSuffix: true,
            })}
          </span>
        ) : (
          <span className="text-foreground/40 text-xs">Never</span>
        )}
      </TableCell>
      <TableCell>
        <span className="font-mono text-sm tabular-nums">
          {connector.syncStatus?.stats.totalIndexed.toLocaleString() ?? 0}
        </span>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div
          className={cn(
            "flex items-center gap-1 transition-opacity duration-150",
            showHoverActions && !isHovered && "opacity-0"
          )}
        >
          <Button
            onClick={() => onRowClick(connector)}
            size="sm"
            variant="ghost"
          >
            View
          </Button>
          <ConnectorActions
            connectorId={connector.id}
            status={connector.status}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
