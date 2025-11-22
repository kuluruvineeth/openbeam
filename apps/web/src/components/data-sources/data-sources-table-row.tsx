"use client";

import { appStore } from "@openplane/integrations";
import { formatDistanceToNow } from "date-fns";
import { AppLogo } from "@/components/integrations/app-logo";
import { SyncStatusBadge } from "@/components/sync/sync-status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import { ConnectorActions } from "./connector-actions";

type DataSource = {
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

type DataSourcesTableRowProps = {
  source: DataSource;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onRowClick: (source: { id: string; name: string; app: string }) => void;
};

export function DataSourcesTableRow({
  source,
  isSelected,
  onSelect,
  onRowClick,
}: DataSourcesTableRowProps) {
  return (
    <TableRow
      className="cursor-pointer transition-colors hover:bg-background-50"
      onClick={(e) => {
        if (
          (e.target as HTMLElement).closest('[data-slot="checkbox"], button')
        ) {
          return;
        }
        onRowClick({
          id: source.id,
          name: source.name,
          app: source.app,
        });
      }}
    >
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          className="cursor-pointer"
          onCheckedChange={(checked) => onSelect(source.id, checked === true)}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <AppLogo
            app={
              appStore.find((a) => a.id === source.app) ?? {
                id: source.app,
                name: source.name,
                logo: undefined,
              }
            }
            size={32}
          />
          <div>
            <p className="font-medium text-sm">{source.name}</p>
            <p className="text-[#878787] text-xs">{source.app}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {source.syncStatus && (
          <SyncStatusBadge
            data={{
              status: (source.syncStatus.connector.status || "ACTIVE") as
                | "SYNCING"
                | "ACTIVE"
                | "ERROR"
                | "INACTIVE"
                | "CONNECTING",
              totalIndexed: source.syncStatus.stats.totalIndexed,
              lastSyncedAt: source.syncStatus.connector.lastSyncedAt,
              error: source.syncStatus.connector.lastError,
            }}
            variant="compact"
          />
        )}
      </TableCell>
      <TableCell>
        {source.lastSyncedAt ? (
          <span className="text-[#878787] text-xs">
            {formatDistanceToNow(new Date(source.lastSyncedAt), {
              addSuffix: true,
            })}
          </span>
        ) : (
          <span className="text-[#878787] text-xs">Never</span>
        )}
      </TableCell>
      <TableCell>
        <span className="font-mono text-sm">
          {source.syncStatus?.stats.totalIndexed.toLocaleString() ?? 0}
        </span>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <ConnectorActions connectorId={source.id} status={source.status} />
      </TableCell>
    </TableRow>
  );
}
