"use client";

import type { MissionAgentLaneState } from "@openplane/types/mission-control";
import { cva } from "class-variance-authority";
import { memo } from "react";
import { cn } from "@/lib/utils";
import { AgentToolCallStrip } from "./agent-tool-call-strip";

const statusDotVariants = cva("h-2 w-2 shrink-0 rounded-full", {
  variants: {
    status: {
      idle: "bg-muted-foreground/40",
      running: "animate-pulse bg-emerald-500",
      blocked: "bg-amber-500",
      completed: "bg-blue-500",
      failed: "bg-red-500",
    },
  },
});

const laneContainerVariants = cva(
  "flex cursor-pointer flex-col gap-1 rounded-sm border px-3 py-2 transition-colors",
  {
    variants: {
      selected: {
        true: "border-primary bg-primary/5",
        false: "border-border/50 hover:border-border hover:bg-muted/30",
      },
    },
    defaultVariants: {
      selected: false,
    },
  }
);

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

type AgentLaneProps = {
  agent: MissionAgentLaneState;
  isSelected: boolean;
  onSelect: (agentId: string) => void;
};

export const AgentLane = memo(function AgentLaneInner({
  agent,
  isSelected,
  onSelect,
}: AgentLaneProps) {
  const progressPercent =
    agent.totalSteps && agent.totalSteps > 0
      ? Math.min((agent.stepsCompleted / agent.totalSteps) * 100, 100)
      : null;

  return (
    <button
      className={cn(laneContainerVariants({ selected: isSelected }))}
      onClick={() => onSelect(agent.agentId)}
      type="button"
    >
      <div className="flex items-center gap-2">
        <span className={statusDotVariants({ status: agent.status })} />

        <span className="truncate font-medium text-sm">{agent.agentName}</span>

        <span className="text-muted-foreground text-xs">{agent.role}</span>

        {agent.model && (
          <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {agent.model}
          </span>
        )}

        {progressPercent !== null && (
          <div className="ml-1 flex items-center gap-1.5">
            <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground/40 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {agent.stepsCompleted}/{agent.totalSteps}
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-3 text-muted-foreground text-xs tabular-nums">
          {progressPercent === null && (
            <span>{agent.stepsCompleted} steps</span>
          )}
          <span>{formatTokens(agent.tokensUsed)} tok</span>
          <span>{formatCost(agent.costCents)}</span>
        </div>
      </div>

      {(agent.currentTaskTitle || agent.recentToolCalls.length > 0) && (
        <div className="flex items-center gap-2 pl-4">
          {agent.currentTaskTitle && (
            <span className="truncate text-muted-foreground text-xs">
              {agent.currentTaskTitle}
            </span>
          )}
          <div className="ml-auto">
            <AgentToolCallStrip toolCalls={agent.recentToolCalls} />
          </div>
        </div>
      )}

      {agent.status === "failed" && agent.errorMessage && (
        <div className="truncate pl-4 text-[10px] text-red-600 dark:text-red-400">
          {agent.errorMessage}
        </div>
      )}
    </button>
  );
});

export { statusDotVariants, laneContainerVariants };
