"use client";

import type {
  MissionAgentLaneState,
  MissionEventLedgerItem,
  ReflectionHistoryEntry,
} from "@openplane/types/mission-control";
import {
  Badge,
  Button,
  Icons,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@openplane/ui";
import { useMutation } from "@tanstack/react-query";
import { cva } from "class-variance-authority";
import { useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getVanillaTRPCClient } from "@/trpc/client";
import {
  reflectionScoreColor,
  TIMEOUT_TIER_LABELS,
  TIMEOUT_TIER_STYLES,
} from "../lib/agent-lane-metrics";

const statusDotVariants = cva("h-2.5 w-2.5 rounded-full", {
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

const toolEventVariants = cva(
  "flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs",
  {
    variants: {
      status: {
        started: "bg-muted/50",
        completed: "bg-muted/30",
        failed: "bg-red-500/5",
      },
    },
    defaultVariants: {
      status: "started",
    },
  }
);

type ToolEvent = {
  eventId: string;
  toolName: string;
  status: "started" | "completed" | "failed";
  timestamp: number;
  durationMs?: number;
  payload?: Record<string, unknown>;
};

type AgentDetailDrawerProps = {
  agentId: string;
  agent: MissionAgentLaneState | undefined;
  events: MissionEventLedgerItem[];
  reflectionEntries: ReflectionHistoryEntry[];
  missionId: string;
  isOpen: boolean;
  onClose: () => void;
};

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

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

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function extractToolEvents(
  events: MissionEventLedgerItem[],
  agentId: string
): ToolEvent[] {
  return events
    .filter(
      (event) =>
        event.payload?.agentId === agentId &&
        event.eventType.startsWith("tool.")
    )
    .map((event) => ({
      eventId: event.eventId,
      toolName: (event.payload?.toolName as string) ?? "unknown",
      status: event.eventType.replace("tool.", "") as ToolEvent["status"],
      timestamp: event.timestamp,
      durationMs: event.payload?.durationMs as number | undefined,
      payload: event.payload,
    }));
}

function nextTierFor(
  current: string
): "quick" | "standard" | "extended" | "marathon" {
  const progression: Record<string, "standard" | "extended" | "marathon"> = {
    quick: "standard",
    standard: "extended",
    extended: "marathon",
  };
  return progression[current] ?? "extended";
}

export function AgentDetailDrawer({
  agentId,
  agent,
  events,
  reflectionEntries,
  missionId,
  isOpen,
  onClose,
}: AgentDetailDrawerProps) {
  const toolEvents = useMemo(
    () => extractToolEvents(events, agentId),
    [events, agentId]
  );

  const extendTimeoutMutation = useMutation({
    mutationFn: (input: {
      missionId: string;
      agentId: string;
      requestedTier: "quick" | "standard" | "extended" | "marathon";
    }) =>
      getVanillaTRPCClient().missionControl.extendAgentTimeout.mutate(input),
    onSuccess: () => toast.success("Timeout extension requested"),
    onError: (error: Error) =>
      toast.error("Failed to extend timeout", { description: error.message }),
  });

  const forceReplanMutation = useMutation({
    mutationFn: (input: { missionId: string; agentId: string }) =>
      getVanillaTRPCClient().missionControl.forceReplan.mutate(input),
    onSuccess: () => toast.success("Replan triggered"),
    onError: (error: Error) =>
      toast.error("Failed to trigger replan", { description: error.message }),
  });

  const cancelAgentMutation = useMutation({
    mutationFn: (input: { missionId: string; agentId: string }) =>
      getVanillaTRPCClient().missionControl.cancelAgent.mutate(input),
    onSuccess: () => {
      toast.success("Agent cancelled");
      onClose();
    },
    onError: (error: Error) =>
      toast.error("Failed to cancel agent", { description: error.message }),
  });

  if (!agent) {
    return null;
  }

  return (
    <Sheet onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <SheetContent
        className="flex w-[420px] flex-col overflow-y-auto p-0 sm:max-w-[420px]"
        side="right"
      >
        <SheetHeader className="border-border/50 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={statusDotVariants({ status: agent.status })} />
            <SheetTitle className="text-base">{agent.agentName}</SheetTitle>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-muted-foreground text-xs">{agent.role}</span>
            {agent.model && (
              <Badge className="font-mono" variant="outline">
                {agent.model}
              </Badge>
            )}
            <Badge
              className={cn(
                agent.status === "running" &&
                  "text-emerald-600 dark:text-emerald-400",
                agent.status === "blocked" &&
                  "text-amber-600 dark:text-amber-400",
                agent.status === "failed" && "text-red-600 dark:text-red-400",
                agent.status === "completed" &&
                  "text-blue-600 dark:text-blue-400"
              )}
              variant="tag"
            >
              {agent.status}
            </Badge>
          </div>
        </SheetHeader>

        <div className="border-border/50 border-b px-4 py-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="font-medium text-lg tabular-nums">
                {agent.stepsCompleted}
                {agent.totalSteps !== undefined && (
                  <span className="text-muted-foreground text-xs">
                    /{agent.totalSteps}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Steps
              </div>
            </div>
            <div>
              <div className="font-medium font-mono text-lg tabular-nums">
                {formatTokens(agent.tokensUsed)}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Tokens
              </div>
            </div>
            <div>
              <div className="font-medium font-mono text-lg tabular-nums">
                {formatCost(agent.costCents)}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Cost
              </div>
            </div>
          </div>
        </div>

        {agent.currentTaskTitle && (
          <div className="border-border/50 border-b px-4 py-2.5">
            <div className="mb-1 text-[10px] text-muted-foreground uppercase tracking-wide">
              Current Task
            </div>
            <div className="text-sm">{agent.currentTaskTitle}</div>
          </div>
        )}

        {agent.errorMessage && (
          <div className="border-border/50 border-b bg-red-500/5 px-4 py-2.5">
            <div className="mb-1 text-[10px] text-red-600 uppercase tracking-wide dark:text-red-400">
              Error
            </div>
            <div className="text-red-600 text-xs dark:text-red-400">
              {agent.errorMessage}
            </div>
          </div>
        )}

        <div className="border-border/50 border-b px-4 py-3">
          <div className="mb-2 text-[10px] text-muted-foreground uppercase tracking-wide">
            Tool Calls ({toolEvents.length})
          </div>

          {toolEvents.length === 0 && (
            <div className="py-4 text-center text-muted-foreground text-xs">
              No tool calls recorded
            </div>
          )}

          <div className="flex flex-col gap-1">
            {toolEvents.map((toolEvent) => (
              <div
                className={toolEventVariants({
                  status: toolEvent.status,
                })}
                key={toolEvent.eventId}
              >
                {toolEvent.status === "completed" && (
                  <Icons.Check
                    className="shrink-0 text-emerald-500"
                    size={12}
                  />
                )}
                {toolEvent.status === "failed" && (
                  <Icons.XCircle className="shrink-0 text-red-500" size={12} />
                )}
                {toolEvent.status === "started" && (
                  <Icons.Loader2
                    className="shrink-0 animate-spin text-muted-foreground"
                    size={12}
                  />
                )}

                <span className="truncate font-mono">{toolEvent.toolName}</span>

                <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
                  {toolEvent.durationMs !== undefined
                    ? formatDuration(toolEvent.durationMs)
                    : formatTimestamp(toolEvent.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {reflectionEntries.length > 0 && (
          <div className="border-border/50 border-b px-4 py-3">
            <div className="mb-2 text-[10px] text-muted-foreground uppercase tracking-wide">
              Reflection Buffer ({reflectionEntries.length})
            </div>
            <div className="flex flex-col gap-1.5">
              {reflectionEntries.slice(-3).map((entry) => (
                <div
                  className="rounded-sm border border-border/40 bg-muted/20 px-2 py-1.5"
                  key={entry.entryId}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                      Step {entry.stepNumber}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-sm border px-1 py-0.5 font-mono text-[10px] tabular-nums",
                        reflectionScoreColor(entry.score)
                      )}
                    >
                      {entry.score.toFixed(2)}
                    </span>
                    {entry.triggeredReplan && (
                      <span className="inline-flex items-center rounded-sm border border-amber-500/30 bg-amber-500/10 px-1 py-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                        Replanned
                      </span>
                    )}
                    <time className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                      {formatTimestamp(entry.timestamp)}
                    </time>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                    {entry.verbalMemory}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {agent.chunkProgress && agent.chunkProgress.total > 0 && (
          <div className="border-border/50 border-b px-4 py-3">
            <div className="mb-2 text-[10px] text-muted-foreground uppercase tracking-wide">
              Chain Progress
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-sm bg-muted">
                <div
                  className="h-full rounded-sm bg-primary/60 transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      (agent.chunkProgress.current /
                        agent.chunkProgress.total) *
                        100,
                      100
                    )}%`,
                  }}
                />
              </div>
              <span className="shrink-0 font-mono text-muted-foreground text-xs tabular-nums">
                {agent.chunkProgress.current}/{agent.chunkProgress.total}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="font-mono text-sm tabular-nums">
                  {formatTokens(agent.tokensUsed)}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Tokens
                </div>
              </div>
              <div>
                <div className="font-mono text-sm tabular-nums">
                  {formatCost(agent.costCents)}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Cost
                </div>
              </div>
              <div>
                {agent.timeoutTier && (
                  <div
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-sm border px-1.5 py-0.5 text-xs",
                      TIMEOUT_TIER_STYLES[agent.timeoutTier]
                    )}
                  >
                    <Icons.Timer size={11} />
                    {TIMEOUT_TIER_LABELS[agent.timeoutTier]}
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Tier
                </div>
              </div>
            </div>
          </div>
        )}

        {agent.status === "running" && (
          <div className="mt-auto border-border/50 border-t px-4 py-3">
            <div className="mb-2 text-[10px] text-muted-foreground uppercase tracking-wide">
              Operator Actions
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="h-7 text-xs"
                disabled={extendTimeoutMutation.isPending}
                onClick={() =>
                  extendTimeoutMutation.mutate({
                    missionId,
                    agentId,
                    requestedTier: nextTierFor(agent.timeoutTier ?? "standard"),
                  })
                }
                size="sm"
                variant="outline"
              >
                <Icons.Timer size={12} />
                Extend Timeout
              </Button>
              <Button
                className="h-7 text-xs"
                disabled={forceReplanMutation.isPending}
                onClick={() =>
                  forceReplanMutation.mutate({ missionId, agentId })
                }
                size="sm"
                variant="outline"
              >
                <Icons.RefreshCw size={12} />
                Force Replan
              </Button>
              <Button
                className="h-7 text-destructive text-xs"
                disabled={cancelAgentMutation.isPending}
                onClick={() =>
                  cancelAgentMutation.mutate({ missionId, agentId })
                }
                size="sm"
                variant="ghost"
              >
                <Icons.X size={12} />
                Cancel Agent
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export { toolEventVariants };
