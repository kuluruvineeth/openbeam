"use client";

import { Icons } from "@openplane/ui";
import { cva } from "class-variance-authority";
import Link from "next/link";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { computeBudgetThreshold, formatCents } from "../lib/budget-utils";
import {
  deriveAgentHeaderMetric,
  deriveRuntimePulse,
  type RuntimePulse,
  summarizeMissionAgentStatuses,
} from "../lib/mission-detail-header-utils";
import {
  useAgentBoard,
  usePendingApprovals,
} from "../stores/mission-runtime-store";
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

const runtimePulseVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-medium text-[10px] uppercase tracking-wide",
  {
    variants: {
      pulse: {
        live: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        attention:
          "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        done: "border-primary/30 bg-primary/10 text-primary",
        idle: "border-border/60 bg-muted/50 text-muted-foreground",
      },
    },
    defaultVariants: { pulse: "idle" },
  }
);

const RUNTIME_PULSE_LABEL: Record<RuntimePulse, string> = {
  live: "Live",
  attention: "Attention",
  done: "Settled",
  idle: "Idle",
};

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
  onOpenArtifacts?: () => void;
};

export function MissionDetailHeader({
  mission,
  onOpenArtifacts,
}: MissionDetailHeaderProps) {
  const threshold =
    mission.budgetCents === null
      ? "safe"
      : computeBudgetThreshold(mission.consumedCents, mission.budgetCents);

  const agentBoard = useAgentBoard();
  const pendingApprovals = usePendingApprovals();

  const agentCounts = useMemo(
    () => summarizeMissionAgentStatuses(agentBoard),
    [agentBoard]
  );
  const pulse = useMemo(
    () =>
      deriveRuntimePulse(mission.status, agentCounts, pendingApprovals.length),
    [mission.status, agentCounts, pendingApprovals.length]
  );
  const agentMetric = useMemo(
    () => deriveAgentHeaderMetric(mission.status, agentCounts),
    [mission.status, agentCounts]
  );

  const isTerminal = ["COMPLETED", "CANCELLED", "ARCHIVED"].includes(
    mission.status
  );
  const showOutputAction = mission.status === "COMPLETED";
  const startedAtMs = mission.createdAt.getTime();
  const endedAtMs = isTerminal ? mission.updatedAt.getTime() : undefined;

  return (
    <div className="flex items-center gap-2 overflow-hidden border-border/50 border-b px-4 py-2 dark:border-[#1d1d1d] dark:bg-[#0c0c0c]">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          className="flex shrink-0 items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground"
          href={"/missions" as "/"}
        >
          <Icons.ArrowLeft size={14} />
          <span>Missions</span>
        </Link>

        <div className="h-4 w-px shrink-0 bg-border/50" />

        <h1 className="min-w-0 truncate font-medium text-sm">{mission.name}</h1>
        <StatusChip status={mission.status} />
        <span className={runtimePulseVariants({ pulse })}>
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              RUNTIME_PULSE_DOT_CLASS[pulse]
            )}
          />
          {RUNTIME_PULSE_LABEL[pulse]}
        </span>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        {showOutputAction && onOpenArtifacts && (
          <button
            className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-2 py-1 text-primary-foreground text-xs transition-colors hover:bg-primary/90"
            onClick={onOpenArtifacts}
            type="button"
          >
            <Icons.FileText size={13} />
            Open Output
          </button>
        )}

        <div className="hidden items-center gap-1 text-muted-foreground text-xs md:flex">
          <Icons.Users size={13} />
          <span>{agentMetric.label}</span>
          <span className="font-mono text-foreground tabular-nums">
            {agentMetric.value}
          </span>
        </div>

        <div className="hidden items-center gap-1 text-muted-foreground text-xs md:flex">
          <Icons.Clock size={13} />
          <ElapsedTimer
            endedAt={endedAtMs}
            startedAt={startedAtMs}
            status={mission.status}
          />
        </div>

        <div
          className={cn(
            "hidden items-center gap-1 text-xs md:flex",
            pendingApprovals.length > 0
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground"
          )}
        >
          <Icons.ShieldAlert size={13} />
          <span>Approvals</span>
          <span className="font-mono tabular-nums">
            {pendingApprovals.length}
          </span>
        </div>

        <div className="h-4 w-px shrink-0 bg-border/50" />

        <div className="flex items-center gap-1.5">
          <Icons.Coins className="text-muted-foreground" size={14} />
          <span className="text-muted-foreground text-xs">Spend</span>
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
    </div>
  );
}

export { headerCostVariants, runtimePulseVariants };
