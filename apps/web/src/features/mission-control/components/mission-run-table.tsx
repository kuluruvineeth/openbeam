"use client";

import { cva } from "class-variance-authority";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

type MissionRow = {
  id: string;
  missionName: string;
  status: string;
  agentCount: number;
  taskCount: number;
  completedTasks: number;
  totalCostCents: number;
  updatedAt: Date;
};

const statusVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-medium text-xs",
  {
    variants: {
      status: {
        DRAFT: "bg-muted text-muted-foreground",
        ACTIVE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        PAUSED: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        COMPLETED: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        CANCELLED: "bg-red-500/10 text-red-600 dark:text-red-400",
        ARCHIVED: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      status: "DRAFT",
    },
  }
);

type StatusKey =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED"
  | "ARCHIVED";

function StatusChip({ status }: { status: string }) {
  const key = (
    [
      "DRAFT",
      "ACTIVE",
      "PAUSED",
      "COMPLETED",
      "CANCELLED",
      "ARCHIVED",
    ].includes(status)
      ? status
      : "DRAFT"
  ) as StatusKey;

  return (
    <span className={statusVariants({ status: key })}>
      {key === "ACTIVE" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
      )}
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

type MissionRunTableProps = {
  missions: MissionRow[];
  onSelect: (id: string) => void;
};

export function MissionRunTable({ missions, onSelect }: MissionRunTableProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useHotkeys(
    "j",
    () => setSelectedIndex((i) => Math.min(i + 1, missions.length - 1)),
    [missions.length]
  );
  useHotkeys("k", () => setSelectedIndex((i) => Math.max(i - 1, 0)));
  useHotkeys("enter", () => {
    const mission = missions[selectedIndex];
    if (mission) {
      onSelect(mission.id);
    }
  }, [selectedIndex, missions]);

  return (
    <div className="w-full overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border/50 border-b">
            <th className="h-10 px-3 text-left font-medium text-muted-foreground">
              Mission
            </th>
            <th className="h-10 px-3 text-left font-medium text-muted-foreground">
              Status
            </th>
            <th className="h-10 px-3 text-right font-medium text-muted-foreground">
              Agents
            </th>
            <th className="h-10 px-3 text-right font-medium text-muted-foreground">
              Tasks
            </th>
            <th className="h-10 px-3 text-right font-medium text-muted-foreground">
              Cost
            </th>
            <th className="h-10 px-3 text-right font-medium text-muted-foreground">
              Updated
            </th>
          </tr>
        </thead>
        <tbody>
          {missions.map((mission, index) => (
            <tr
              className={`cursor-pointer border-border/30 border-b transition-colors ${
                index === selectedIndex ? "bg-accent" : "hover:bg-muted/50"
              }`}
              key={mission.id}
              onClick={() => {
                setSelectedIndex(index);
                onSelect(mission.id);
              }}
            >
              <td className="h-11 px-3 font-medium">{mission.missionName}</td>
              <td className="h-11 px-3">
                <StatusChip status={mission.status} />
              </td>
              <td className="h-11 px-3 text-right tabular-nums">
                {mission.agentCount}
              </td>
              <td className="h-11 px-3 text-right tabular-nums">
                {mission.completedTasks}/{mission.taskCount}
              </td>
              <td className="h-11 px-3 text-right tabular-nums">
                {formatCost(mission.totalCostCents)}
              </td>
              <td className="h-11 px-3 text-right text-muted-foreground">
                {new Date(mission.updatedAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
