"use client";

import { Icons } from "@openplane/ui";
import { cva } from "class-variance-authority";
import Link from "next/link";
import { computeBudgetThreshold, formatCents } from "../lib/budget-utils";
import { ElapsedTimer } from "./elapsed-timer";
import { StatusChip } from "./status-chip";

const headerCostVariants = cva("font-mono text-sm tabular-nums", {
  variants: {
    threshold: {
      safe: "text-muted-foreground",
      warning: "text-amber-600 dark:text-amber-400",
      danger: "text-destructive",
      exceeded: "font-semibold text-destructive",
    },
  },
  defaultVariants: { threshold: "safe" },
});

type Mission = {
  id: string;
  name: string;
  objective: string;
  status: string;
  budgetCents: number | null;
  consumedCents: number;
  startedAt: Date | null;
};

type MissionDetailHeaderProps = {
  mission: Mission;
};

export function MissionDetailHeader({ mission }: MissionDetailHeaderProps) {
  const threshold = computeBudgetThreshold(
    mission.consumedCents,
    mission.budgetCents ?? 0
  );

  const objectivePreview =
    mission.objective.length > 80
      ? `${mission.objective.slice(0, 80)}...`
      : mission.objective;

  const startedAtMs = mission.startedAt ? mission.startedAt.getTime() : 0;

  return (
    <div className="flex items-center gap-3 border-border/50 border-b px-4 py-2.5">
      <Link
        className="flex items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground"
        href={"/missions" as "/"}
      >
        <Icons.ArrowLeft size={14} />
        <span>Missions</span>
      </Link>

      <div className="h-4 w-px bg-border/50" />

      <h1 className="max-w-[200px] truncate font-medium text-lg">
        {mission.name}
      </h1>

      <StatusChip status={mission.status} />

      <ElapsedTimer startedAt={startedAtMs} status={mission.status} />

      <p className="hidden max-w-[300px] truncate text-muted-foreground text-sm lg:block">
        {objectivePreview}
      </p>

      <div className="ml-auto flex items-center gap-1.5">
        <Icons.Coins className="text-muted-foreground" size={14} />
        <span className={headerCostVariants({ threshold })}>
          {formatCents(mission.consumedCents)}
          {mission.budgetCents !== null && (
            <span className="text-muted-foreground">
              {" / "}
              {formatCents(mission.budgetCents)}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

export { headerCostVariants };
