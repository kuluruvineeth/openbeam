"use client";

import { Icons } from "@openplane/ui";
import { cva } from "class-variance-authority";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { computeBudgetThreshold, formatCents } from "../lib/budget-utils";
import {
  deriveRuntimePulse,
  type RuntimePulse,
} from "../lib/mission-detail-header-utils";
import {
  useAgentStatusCounts,
  usePendingApprovals,
} from "../stores/mission-runtime-store";
import { ElapsedTimer } from "./elapsed-timer";
import { StatusChip } from "./status-chip";

const headerCostVariants = cva("font-mono text-xs tabular-nums", {
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

const RUNTIME_PULSE_DOT_CLASS: Record<RuntimePulse, string> = {
  live: "animate-pulse bg-emerald-500",
  attention: "bg-amber-500",
  done: "bg-primary",
  idle: "bg-muted-foreground/50",
};

type Mission = {
  id: string;
  name: string;
  status: string;
  budgetCents: number | null;
  consumedCents: number;
  createdAt: Date;
  updatedAt: Date;
};

type MissionDetailHeaderProps = {
  mission: Mission;
};

export function MissionDetailHeader({ mission }: MissionDetailHeaderProps) {
  const threshold =
    mission.budgetCents === null
      ? "safe"
      : computeBudgetThreshold(mission.consumedCents, mission.budgetCents);

  const agentCounts = useAgentStatusCounts();
  const pendingApprovals = usePendingApprovals();

  const pulse = deriveRuntimePulse(
    mission.status,
    agentCounts,
    pendingApprovals.length
  );

  const isTerminal = ["COMPLETED", "CANCELLED", "ARCHIVED"].includes(
    mission.status
  );
  const startedAtMs = mission.createdAt.getTime();
  const endedAtMs = isTerminal ? mission.updatedAt.getTime() : undefined;

  return (
    <div className="flex items-center gap-2 overflow-hidden border-border/50 border-b px-4 py-1.5 dark:border-[#1d1d1d] dark:bg-[#0c0c0c]">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          className="flex shrink-0 items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
          href={"/missions" as "/"}
        >
          <Icons.ArrowLeft size={13} />
          <span>Missions</span>
        </Link>

        <div className="h-3.5 w-px shrink-0 bg-border/50" />

        <h1 className="min-w-0 truncate font-medium text-sm">{mission.name}</h1>
        <StatusChip status={mission.status} />
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            RUNTIME_PULSE_DOT_CLASS[pulse]
          )}
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3 text-muted-foreground text-xs">
        <div className="hidden items-center gap-1 md:flex">
          <Icons.Clock size={12} />
          <ElapsedTimer
            endedAt={endedAtMs}
            startedAt={startedAtMs}
            status={mission.status}
          />
        </div>

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
