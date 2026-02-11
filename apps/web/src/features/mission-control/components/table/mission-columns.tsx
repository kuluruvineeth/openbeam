"use client";

import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icons,
} from "@openplane/ui";
import { formatDistanceToNow } from "date-fns";
import type { ReactNode } from "react";
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

type ColumnDefinition = {
  id: string;
  header: string;
  width: number;
  align?: "left" | "right";
  renderCell: (row: MissionRow, handlers: CellHandlers) => ReactNode;
};

type CellHandlers = {
  isSelected: boolean;
  onToggleSelection: () => void;
  allSelected: boolean;
  onToggleAll: () => void;
};

function formatCentsCompact(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const missionColumns: ColumnDefinition[] = [
  {
    id: "select",
    header: "",
    width: 40,
    renderCell: (_row, handlers) => (
      <Checkbox
        aria-label="Select row"
        checked={handlers.isSelected}
        onCheckedChange={() => handlers.onToggleSelection()}
        onClick={(e) => e.stopPropagation()}
      />
    ),
  },
  {
    id: "name",
    header: "Mission",
    width: 0,
    renderCell: (row) => (
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-medium text-sm">{row.name}</span>
        {row.objective && (
          <span className="line-clamp-1 text-muted-foreground text-xs">
            {row.objective}
          </span>
        )}
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    width: 120,
    renderCell: (row) => <StatusChip status={row.status} />,
  },
  {
    id: "agents",
    header: "Agents",
    width: 80,
    align: "right",
    renderCell: (row) => (
      <span className="w-full text-right tabular-nums">{row.agentCount}</span>
    ),
  },
  {
    id: "progress",
    header: "Progress",
    width: 140,
    align: "right",
    renderCell: (row) => {
      const ratio = row.taskCount > 0 ? row.completedTasks / row.taskCount : 0;
      return (
        <div className="flex w-full items-center justify-end gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
          <span className="text-muted-foreground text-xs tabular-nums">
            {row.completedTasks}/{row.taskCount}
          </span>
        </div>
      );
    },
  },
  {
    id: "cost",
    header: "Cost",
    width: 100,
    align: "right",
    renderCell: (row) => (
      <div className="flex w-full flex-col items-end">
        <span className="text-sm tabular-nums">
          {formatCentsCompact(row.totalCostCents)}
        </span>
        {row.budgetCents !== null && row.budgetCents > 0 && (
          <span className="text-muted-foreground text-xs tabular-nums">
            / {formatCentsCompact(row.budgetCents)}
          </span>
        )}
      </div>
    ),
  },
  {
    id: "updated",
    header: "Updated",
    width: 120,
    renderCell: (row) => (
      <span className="text-muted-foreground text-xs">
        {formatDistanceToNow(new Date(row.updatedAt), { addSuffix: true })}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    width: 40,
    renderCell: (row) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="h-7 w-7"
            onClick={(e) => e.stopPropagation()}
            size="icon"
            variant="ghost"
          >
            <Icons.MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem data-action="pause" data-mission-id={row.id}>
            <Icons.Pause className="mr-2 h-4 w-4" />
            Pause
          </DropdownMenuItem>
          <DropdownMenuItem data-action="cancel" data-mission-id={row.id}>
            <Icons.XCircle className="mr-2 h-4 w-4" />
            Cancel
          </DropdownMenuItem>
          <DropdownMenuItem data-action="archive" data-mission-id={row.id}>
            <Icons.Archive className="mr-2 h-4 w-4" />
            Archive
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            data-action="delete"
            data-mission-id={row.id}
          >
            <Icons.Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

const SKELETON_COLUMNS = [
  { id: "select", width: 40 },
  { id: "name", width: 0 },
  { id: "status", width: 120 },
  { id: "agents", width: 80 },
  { id: "progress", width: 140 },
  { id: "cost", width: 100 },
  { id: "updated", width: 120 },
  { id: "actions", width: 40 },
] as const;

export { missionColumns, SKELETON_COLUMNS, formatCentsCompact };
export type { MissionRow, ColumnDefinition, CellHandlers };
