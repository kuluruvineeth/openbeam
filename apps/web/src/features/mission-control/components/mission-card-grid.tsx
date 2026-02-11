"use client";

import { cva } from "class-variance-authority";
import { StatusChip } from "./status-chip";

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

const missionCardVariants = cva(
  "cursor-pointer rounded-md border p-4 text-left transition-colors",
  {
    variants: {
      status: {
        ACTIVE: "border-emerald-500/30 hover:bg-emerald-500/5",
        COMPLETED: "border-primary/20 hover:bg-primary/5",
        FAILED: "border-destructive/20 hover:bg-destructive/5",
        CANCELLED: "border-destructive/20 hover:bg-destructive/5",
        default: "border-border/50 hover:bg-muted/50",
      },
    },
    defaultVariants: {
      status: "default",
    },
  }
);

function resolveCardStatus(
  status: string
): "ACTIVE" | "COMPLETED" | "FAILED" | "CANCELLED" | "default" {
  const mapped: Record<
    string,
    "ACTIVE" | "COMPLETED" | "FAILED" | "CANCELLED"
  > = {
    ACTIVE: "ACTIVE",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    CANCELLED: "CANCELLED",
  };
  return mapped[status] ?? "default";
}

function formatCostDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ago`;
  }
  if (hours > 0) {
    return `${hours}h ago`;
  }
  if (minutes > 0) {
    return `${minutes}m ago`;
  }
  return "just now";
}

type MissionCardGridProps = {
  missions: MissionRow[];
  onMissionClick: (id: string) => void;
};

export function MissionCardGrid({
  missions,
  onMissionClick,
}: MissionCardGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {missions.map((mission) => (
        <button
          className={missionCardVariants({
            status: resolveCardStatus(mission.status),
          })}
          key={mission.id}
          onClick={() => onMissionClick(mission.id)}
          type="button"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="truncate font-medium text-sm">{mission.name}</span>
            <StatusChip status={mission.status} />
          </div>
          {mission.objective && (
            <p className="mt-1.5 line-clamp-2 text-muted-foreground text-xs">
              {mission.objective}
            </p>
          )}
          <div className="mt-3 flex items-center gap-3 text-muted-foreground text-xs">
            <span>
              {mission.agentCount} agent{mission.agentCount !== 1 ? "s" : ""}
            </span>
            <span>
              {mission.completedTasks}/{mission.taskCount} tasks
            </span>
            {mission.totalCostCents > 0 && (
              <span>{formatCostDollars(mission.totalCostCents)}</span>
            )}
            <span className="ml-auto">
              {formatRelativeTime(mission.updatedAt)}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

export { missionCardVariants, type MissionRow };
