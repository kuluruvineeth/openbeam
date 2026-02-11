"use client";

import type {
  MissionAgentLaneState,
  MissionEventLedgerItem,
} from "@openplane/types/mission-control";
import {
  Badge,
  Icons,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@openplane/ui";
import { cva } from "class-variance-authority";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

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

type ToolEvent = {
  eventId: string;
  toolName: string;
  status: "started" | "completed" | "failed";
  timestamp: number;
  durationMs?: number;
  payload?: Record<string, unknown>;
};

function extractToolEvents(
  events: MissionEventLedgerItem[],
  agentId: string
): ToolEvent[] {
  return events
    .filter(
      (e) => e.payload?.agentId === agentId && e.eventType.startsWith("tool.")
    )
    .map((e) => ({
      eventId: e.eventId,
      toolName: (e.payload?.toolName as string) ?? "unknown",
      status: e.eventType.replace("tool.", "") as ToolEvent["status"],
      timestamp: e.timestamp,
      durationMs: e.payload?.durationMs as number | undefined,
      payload: e.payload,
    }));
}

type AgentDetailDrawerProps = {
  agentId: string;
  agent: MissionAgentLaneState | undefined;
  events: MissionEventLedgerItem[];
  isOpen: boolean;
  onClose: () => void;
};

export function AgentDetailDrawer({
  agentId,
  agent,
  events,
  isOpen,
  onClose,
}: AgentDetailDrawerProps) {
  const toolEvents = useMemo(
    () => extractToolEvents(events, agentId),
    [events, agentId]
  );

  if (!agent) {
    return null;
  }

  return (
    <Sheet onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <SheetContent
        className="w-[400px] overflow-y-auto p-0 sm:max-w-[400px]"
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

        <div className="px-4 py-3">
          <div className="mb-2 text-[10px] text-muted-foreground uppercase tracking-wide">
            Tool Calls ({toolEvents.length})
          </div>

          {toolEvents.length === 0 && (
            <div className="py-4 text-center text-muted-foreground text-xs">
              No tool calls recorded
            </div>
          )}

          <div className="flex flex-col gap-1">
            {toolEvents.map((te) => (
              <div
                className={toolEventVariants({
                  status: te.status,
                })}
                key={te.eventId}
              >
                {te.status === "completed" && (
                  <Icons.Check
                    className="shrink-0 text-emerald-500"
                    size={12}
                  />
                )}
                {te.status === "failed" && (
                  <Icons.XCircle className="shrink-0 text-red-500" size={12} />
                )}
                {te.status === "started" && (
                  <Icons.Loader2
                    className="shrink-0 animate-spin text-muted-foreground"
                    size={12}
                  />
                )}

                <span className="truncate font-mono">{te.toolName}</span>

                <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
                  {te.durationMs !== undefined
                    ? formatDuration(te.durationMs)
                    : formatTimestamp(te.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { toolEventVariants };
