"use client";

import type { MissionAgentLaneState } from "@openplane/types/mission-control";
import { Icons } from "@openplane/ui";
import { memo, useMemo } from "react";

type SquadHeaderProps = {
  agents: MissionAgentLaneState[];
};

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return String(tokens);
}

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export const SquadHeader = memo(function SquadHeaderInner({
  agents,
}: SquadHeaderProps) {
  const stats = useMemo(() => {
    const active = agents.filter((a) => a.status === "running").length;
    const blocked = agents.filter((a) => a.status === "blocked").length;
    const totalTokens = agents.reduce((sum, a) => sum + a.tokensUsed, 0);
    const totalCost = agents.reduce((sum, a) => sum + a.costCents, 0);
    const totalSteps = agents.reduce((sum, a) => sum + a.stepsCompleted, 0);

    return {
      active,
      blocked,
      total: agents.length,
      totalTokens,
      totalCost,
      totalSteps,
    };
  }, [agents]);

  return (
    <div className="flex items-center gap-4 border-border/50 border-b px-3 py-1.5 text-muted-foreground text-xs">
      <div className="flex items-center gap-1.5">
        <Icons.Users size={12} />
        <span className="tabular-nums">
          <span className="font-medium text-foreground">{stats.active}</span>
          {" / "}
          {stats.total}
        </span>
        <span>active</span>
      </div>

      {stats.blocked > 0 && (
        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
          <Icons.LockIcon size={12} />
          <span className="font-medium tabular-nums">{stats.blocked}</span>
          <span>blocked</span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Icons.Zap size={12} />
          <span className="tabular-nums">{stats.totalSteps} steps</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Icons.Message size={12} />
          <span className="tabular-nums">
            {formatTokens(stats.totalTokens)} tok
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Icons.Coins size={12} />
          <span className="font-medium text-foreground tabular-nums">
            {formatCost(stats.totalCost)}
          </span>
        </div>
      </div>
    </div>
  );
});
