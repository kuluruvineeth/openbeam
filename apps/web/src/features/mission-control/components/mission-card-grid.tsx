"use client";

import { Icons } from "@openplane/ui";
import { formatCents } from "../lib/budget-utils";
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

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60_000);
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
      {missions.map((mission) => {
        const ratio =
          mission.taskCount > 0
            ? mission.completedTasks / mission.taskCount
            : 0;

        return (
          <button
            className="group flex h-[180px] cursor-pointer flex-col justify-between rounded-sm border border-border/50 p-4 text-left transition-all duration-300 hover:border-border hover:bg-[#F2F1EF] dark:border-[#1d1d1d] dark:bg-[#0c0c0c] dark:hover:border-[#222222] dark:hover:bg-[#0f0f0f]"
            key={mission.id}
            onClick={() => onMissionClick(mission.id)}
            type="button"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 truncate font-medium text-sm">
                  {mission.name}
                </h3>
                <StatusChip status={mission.status} />
              </div>
              {mission.objective && (
                <p className="mt-1.5 line-clamp-2 text-muted-foreground text-xs leading-relaxed">
                  {mission.objective}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {mission.completedTasks}/{mission.taskCount}
                </span>
              </div>

              <div className="flex items-center gap-3 text-muted-foreground text-xs tabular-nums">
                <span className="flex items-center gap-1">
                  <Icons.BotIcon className="size-3" />
                  {mission.agentCount}
                </span>
                {mission.totalCostCents > 0 && (
                  <span>{formatCents(mission.totalCostCents)}</span>
                )}
                <span className="ml-auto">
                  {formatRelativeTime(mission.updatedAt)}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export type { MissionRow };
