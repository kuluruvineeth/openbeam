"use client";

import {
  Button,
  Checkbox,
  ColumnHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icons,
  type TableColumnMeta,
} from "@openplane/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { StatusChip } from "../status-chip";

type MissionRow = {
  id: string;
  name: string;
  objective: string;
  status: string;
  agentCount: number;
  taskCount: number;
  completedTasks: number;
  totalCostCents: number;
  budgetCents: number | null;
  consumedCents: number;
  createdAt: Date;
  updatedAt: Date;
};

function formatCentsCompact(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const missionColumns: ColumnDef<MissionRow>[] = [
  {
    id: "select",
    size: 50,
    minSize: 50,
    maxSize: 50,
    enableResizing: false,
    enableSorting: false,
    meta: {
      sticky: true,
      className: "justify-center",
    } satisfies TableColumnMeta,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all"
        checked={table.getIsAllRowsSelected()}
        onCheckedChange={(checked) => table.toggleAllRowsSelected(!!checked)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label="Select row"
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(!!checked)}
        onClick={(e) => e.stopPropagation()}
      />
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => <ColumnHeader column={column} title="Mission" />,
    size: 280,
    minSize: 200,
    maxSize: 600,
    enableResizing: true,
    enableSorting: true,
    meta: {
      sticky: true,
      sortField: "name",
      headerLabel: "Mission",
    } satisfies TableColumnMeta,
    cell: ({ row }) => (
      <span className="truncate font-medium text-sm">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <ColumnHeader column={column} title="Status" />,
    size: 120,
    minSize: 100,
    enableSorting: true,
    meta: {
      sortField: "status",
      headerLabel: "Status",
    } satisfies TableColumnMeta,
    cell: ({ row }) => <StatusChip status={row.original.status} />,
  },
  {
    accessorKey: "agentCount",
    header: ({ column }) => <ColumnHeader column={column} title="Agents" />,
    size: 90,
    minSize: 70,
    enableSorting: true,
    meta: {
      sortField: "agentCount",
      headerLabel: "Agents",
    } satisfies TableColumnMeta,
    cell: ({ row }) => (
      <span className="w-full text-right tabular-nums">
        {row.original.agentCount}
      </span>
    ),
  },
  {
    id: "progress",
    header: ({ column }) => <ColumnHeader column={column} title="Progress" />,
    size: 160,
    minSize: 120,
    enableSorting: false,
    meta: { headerLabel: "Progress" } satisfies TableColumnMeta,
    cell: ({ row }) => {
      const { taskCount, completedTasks } = row.original;
      const ratio = taskCount > 0 ? completedTasks / taskCount : 0;
      return (
        <div className="flex w-full items-center justify-end gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
          <span className="text-muted-foreground text-xs tabular-nums">
            {completedTasks}/{taskCount}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "totalCostCents",
    header: ({ column }) => <ColumnHeader column={column} title="Cost" />,
    size: 110,
    minSize: 90,
    enableSorting: true,
    meta: {
      sortField: "totalCostCents",
      headerLabel: "Cost",
    } satisfies TableColumnMeta,
    cell: ({ row }) => (
      <span className="w-full text-right text-sm tabular-nums">
        {formatCentsCompact(row.original.totalCostCents)}
      </span>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => <ColumnHeader column={column} title="Updated" />,
    size: 130,
    minSize: 100,
    enableSorting: true,
    meta: {
      sortField: "updatedAt",
      headerLabel: "Updated",
    } satisfies TableColumnMeta,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {formatDistanceToNow(new Date(row.original.updatedAt), {
          addSuffix: true,
        })}
      </span>
    ),
  },
  {
    id: "actions",
    size: 50,
    minSize: 50,
    maxSize: 50,
    enableResizing: false,
    enableSorting: false,
    meta: { className: "justify-center" } satisfies TableColumnMeta,
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="h-8 w-8"
            onClick={(e) => e.stopPropagation()}
            size="icon"
            variant="ghost"
          >
            <Icons.MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            data-action="pause"
            data-mission-id={row.original.id}
          >
            <Icons.Pause className="mr-2 h-4 w-4" />
            Pause
          </DropdownMenuItem>
          <DropdownMenuItem
            data-action="cancel"
            data-mission-id={row.original.id}
          >
            <Icons.XCircle className="mr-2 h-4 w-4" />
            Cancel
          </DropdownMenuItem>
          <DropdownMenuItem
            data-action="archive"
            data-mission-id={row.original.id}
          >
            <Icons.Archive className="mr-2 h-4 w-4" />
            Archive
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            data-action="delete"
            data-mission-id={row.original.id}
          >
            <Icons.Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

const MISSION_TABLE_CONFIG = {
  stickyColumns: [
    { id: "select", width: 50 },
    { id: "name", width: 280 },
  ],
  nonReorderableColumns: new Set(["select", "actions"]),
  nonClickableColumns: new Set(["select", "actions"]),
  rowHeight: 45,
} as const;

export { missionColumns, MISSION_TABLE_CONFIG, formatCentsCompact };
export type { MissionRow };
