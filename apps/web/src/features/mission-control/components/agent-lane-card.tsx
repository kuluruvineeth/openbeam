"use client";

import type {
  MissionAgentLaneState,
  MissionApprovalQueueItem,
} from "@openplane/types/mission-control";
import { Button, Icons } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  buildAgentMetricTokens,
  formatAgentLastActivity,
  reflectionScoreColor,
  TIMEOUT_TIER_LABELS,
  TIMEOUT_TIER_STYLES,
} from "../lib/agent-lane-metrics";
import { formatAbsoluteClockTime } from "../lib/time-display";
import { AgentToolCallStrip } from "./agent-tool-call-strip";

const STATUS_INDICATOR: Record<
  MissionAgentLaneState["status"],
  { dot: string; label: string; statusBadge: string }
> = {
  idle: {
    dot: "bg-muted-foreground/40",
    label: "Idle",
    statusBadge: "border-border/50 bg-muted/50 text-muted-foreground",
  },
  running: {
    dot: "bg-emerald-500",
    label: "Running",
    statusBadge:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  blocked: {
    dot: "bg-amber-500",
    label: "Awaiting",
    statusBadge:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  completed: {
    dot: "bg-emerald-500",
    label: "Done",
    statusBadge: "border-border/50 bg-muted/40 text-muted-foreground",
  },
  failed: {
    dot: "bg-destructive",
    label: "Failed",
    statusBadge: "border-destructive/25 bg-destructive/10 text-destructive",
  },
};

const agentCardVariants = cva(
  "group relative flex cursor-pointer flex-col gap-1 rounded-sm border text-left transition-all duration-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  {
    variants: {
      status: {
        idle: "border-border/40 hover:bg-muted/30 dark:border-[#1d1d1d] dark:hover:bg-[#0f0f0f]",
        running:
          "border-primary/20 bg-primary/[0.02] hover:bg-primary/[0.04] dark:border-primary/15",
        blocked:
          "border-amber-500/30 bg-amber-500/[0.02] hover:bg-amber-500/[0.04] dark:border-amber-500/20",
        completed:
          "border-border/40 hover:bg-muted/30 dark:border-[#1d1d1d] dark:hover:bg-[#0f0f0f]",
        failed:
          "border-destructive/20 bg-destructive/[0.02] hover:bg-destructive/[0.04] dark:border-destructive/15",
      },
      selected: {
        true: "border-primary/50 bg-primary/[0.05] shadow-[inset_0_0_0_1px_rgba(59,130,246,0.22)] shadow-primary/5",
        false: "",
      },
      reflecting: {
        true: "ring-1 ring-blue-400/35",
        false: "",
      },
      level: {
        lead: "px-3 py-2.5",
        member: "px-2.5 py-2",
      },
    },
    defaultVariants: {
      status: "idle",
      selected: false,
      reflecting: false,
      level: "member",
    },
  }
);

type AgentLaneCardProps = {
  agent: MissionAgentLaneState;
  isSelected?: boolean;
  level?: "lead" | "member";
  delegateCount?: number;
  pendingApproval: MissionApprovalQueueItem | undefined;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onSelect?: (agentId: string) => void;
};

const PROGRESS_BAR_COLORS: Record<string, string> = {
  completed: "bg-emerald-500/60",
  failed: "bg-destructive/60",
};

function progressBarColor(status: string): string {
  return PROGRESS_BAR_COLORS[status] ?? "bg-foreground/30";
}

function formatRoleLabel(role: string, isLead: boolean): string {
  if (isLead) {
    return "Lead";
  }

  if (!role) {
    return "Agent";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function AgentLaneCard({
  agent,
  isSelected,
  level = "member",
  delegateCount,
  pendingApproval,
  onApprove,
  onReject,
  onSelect,
}: AgentLaneCardProps) {
  const isLead = level === "lead";
  const statusInfo = STATUS_INDICATOR[agent.status];
  const activity = agent.currentTaskTitle;
  const progressPercent =
    agent.totalSteps && agent.totalSteps > 0
      ? Math.min((agent.stepsCompleted / agent.totalSteps) * 100, 100)
      : null;
  const metricTokens = buildAgentMetricTokens(agent, progressPercent !== null);
  const nowMs = Date.now();
  const lastActivityLabel = formatAgentLastActivity(
    agent.lastActivityAt,
    nowMs
  );
  const lastActivityDateTime =
    typeof agent.lastActivityAt === "number"
      ? new Date(agent.lastActivityAt).toISOString()
      : null;
  const lastActivityAbsolute =
    typeof agent.lastActivityAt === "number"
      ? formatAbsoluteClockTime(agent.lastActivityAt, nowMs)
      : null;
  const showLastActivityAbsolute =
    Boolean(lastActivityAbsolute) && lastActivityAbsolute !== lastActivityLabel;
  const roleLabel = formatRoleLabel(agent.role, isLead);
  const normalizedRole = agent.role.trim().toLowerCase();
  const showRoleTag =
    isLead || (normalizedRole.length > 0 && normalizedRole !== "specialist");

  return (
    <button
      aria-pressed={Boolean(isSelected)}
      className={cn(
        agentCardVariants({
          status: agent.status,
          selected: isSelected,
          reflecting: agent.isReflecting ?? false,
          level,
        })
      )}
      onClick={() => onSelect?.(agent.agentId)}
      type="button"
    >
      <div className="flex items-center gap-2">
        <div className="relative flex shrink-0 items-center justify-center">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              statusInfo.dot,
              agent.status === "running" && "animate-pulse"
            )}
          />
          {agent.status === "running" && (
            <span
              className={cn(
                "absolute inset-0 h-2 w-2 animate-ping rounded-full opacity-40",
                statusInfo.dot
              )}
            />
          )}
        </div>

        <span
          className={cn("truncate font-medium", isLead ? "text-sm" : "text-xs")}
        >
          {agent.agentName}
        </span>

        {showRoleTag && (
          <span className="inline-flex items-center gap-0.5 rounded-sm border border-border/50 px-1 py-0.5 text-[10px] text-muted-foreground">
            {isLead && <Icons.Workflow size={10} />}
            {roleLabel}
          </span>
        )}

        {agent.model && (
          <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {agent.model}
          </span>
        )}

        <span
          className={cn(
            "ml-auto inline-flex shrink-0 items-center rounded-sm border px-1 py-0.5 text-[10px]",
            statusInfo.statusBadge
          )}
        >
          {statusInfo.label}
        </span>
      </div>

      {isLead && delegateCount !== undefined && delegateCount > 0 && (
        <div className="flex items-center gap-1.5 pl-4 text-[10px] text-muted-foreground">
          <Icons.GitBranch className="text-muted-foreground/60" size={10} />
          <span>
            Orchestrating{" "}
            <span className="font-medium text-foreground tabular-nums">
              {delegateCount}
            </span>{" "}
            agent{delegateCount > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {activity && (
        <div className="flex items-center gap-1.5 pl-4">
          <Icons.CornerDownRight
            className="shrink-0 text-muted-foreground/40"
            size={10}
          />
          <p className="truncate text-[11px] text-muted-foreground">
            {activity}
          </p>
        </div>
      )}

      {agent.recentToolCalls.length > 0 && (
        <div className="pl-4">
          <AgentToolCallStrip toolCalls={agent.recentToolCalls} />
        </div>
      )}

      {progressPercent !== null && (
        <div className="flex items-center gap-2 pl-4">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progressBarColor(agent.status)
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
            {agent.stepsCompleted}/{agent.totalSteps}
          </span>
        </div>
      )}

      {agent.chunkProgress && agent.chunkProgress.total > 0 && (
        <div className="flex items-center gap-2 pl-4">
          <div className="h-1 flex-1 overflow-hidden rounded-sm bg-muted">
            <div
              className="h-full rounded-sm bg-primary/50 transition-all duration-500"
              style={{
                width: `${Math.min(
                  (agent.chunkProgress.current / agent.chunkProgress.total) *
                    100,
                  100
                )}%`,
              }}
            />
          </div>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">
            {agent.chunkProgress.current}/{agent.chunkProgress.total}
          </span>
        </div>
      )}

      {(agent.reflectionScore !== null &&
        agent.reflectionScore !== undefined) ||
      agent.replanCount > 0 ? (
        <div className="flex items-center gap-1.5 pl-4">
          {agent.reflectionScore !== null &&
            agent.reflectionScore !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-sm border px-1 py-0.5 text-[10px] tabular-nums",
                  reflectionScoreColor(agent.reflectionScore)
                )}
              >
                <Icons.BrainCircuit size={9} />
                {agent.reflectionScore.toFixed(2)}
              </span>
            )}
          {agent.replanCount > 0 && (
            <span className="inline-flex items-center rounded-sm border border-amber-500/30 bg-amber-500/10 px-1 py-0.5 text-[10px] text-amber-600 tabular-nums dark:text-amber-400">
              R{agent.replanCount}
            </span>
          )}
        </div>
      ) : null}

      {agent.spawnedBy && (
        <div className="flex items-center gap-1.5 pl-4 text-[10px] text-muted-foreground">
          <Icons.GitBranch
            className="shrink-0 text-muted-foreground/60"
            size={10}
          />
          <span className="truncate">
            Spawned by{" "}
            <span className="font-medium text-foreground">
              {agent.spawnedBy}
            </span>
          </span>
        </div>
      )}

      {agent.messageCount &&
        (agent.messageCount.sent > 0 || agent.messageCount.received > 0) && (
          <div className="flex items-center gap-1.5 pl-4 text-[10px] text-muted-foreground tabular-nums">
            <Icons.MessageSquare
              className="shrink-0 text-muted-foreground/60"
              size={10}
            />
            <span>
              {agent.messageCount.sent}
              {" sent / "}
              {agent.messageCount.received}
              {" recv"}
            </span>
          </div>
        )}

      {agent.timeoutTier &&
        (agent.timeoutTier === "extended" ||
          agent.timeoutTier === "marathon") && (
          <div className="flex items-center gap-1.5 pl-4">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-sm border px-1 py-0.5 text-[10px]",
                TIMEOUT_TIER_STYLES[agent.timeoutTier]
              )}
            >
              <Icons.Timer size={9} />
              {TIMEOUT_TIER_LABELS[agent.timeoutTier]}
            </span>
          </div>
        )}

      {agent.stuckReason && agent.status !== "failed" && (
        <div className="flex items-center gap-1.5 pl-4">
          <Icons.AlertTriangle
            className="shrink-0 text-amber-500/70"
            size={10}
          />
          <p className="truncate text-[10px] text-amber-600 dark:text-amber-400">
            {agent.stuckReason}
          </p>
        </div>
      )}

      {metricTokens.length > 0 && (
        <div className="pl-4 text-[10px] text-muted-foreground/90 tabular-nums">
          {metricTokens.join(" · ")}
        </div>
      )}

      {lastActivityLabel &&
        lastActivityDateTime &&
        agent.status !== "running" && (
          <div className="flex items-center gap-1.5 pl-4 text-[10px] text-muted-foreground/90">
            <Icons.Clock
              className="shrink-0 text-muted-foreground/60"
              size={10}
            />
            <time className="truncate" dateTime={lastActivityDateTime}>
              Updated {lastActivityLabel}
            </time>
            {showLastActivityAbsolute && (
              <span className="truncate text-muted-foreground/70">
                {lastActivityAbsolute}
              </span>
            )}
          </div>
        )}

      {agent.status === "failed" && agent.errorMessage && (
        <div className="flex items-center gap-1.5 pl-4">
          <Icons.AlertCircle
            className="shrink-0 text-destructive/70"
            size={10}
          />
          <p className="truncate text-[10px] text-destructive">
            {agent.errorMessage}
          </p>
        </div>
      )}

      {agent.status === "blocked" && pendingApproval && (
        <div className="mt-0.5 flex items-center gap-1.5 rounded-sm border border-amber-500/20 bg-amber-500/[0.03] px-2 py-1">
          <Icons.ShieldAlert className="shrink-0 text-amber-500" size={12} />
          <span className="min-w-0 flex-1 truncate text-[11px]">
            {pendingApproval.actionIntent}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              className="h-5 px-1.5 text-[10px]"
              onClick={(e) => {
                e.stopPropagation();
                onApprove(pendingApproval.approvalId);
              }}
              size="sm"
              variant="outline"
            >
              Approve
            </Button>
            <Button
              className="h-5 px-1.5 text-[10px]"
              onClick={(e) => {
                e.stopPropagation();
                onReject(pendingApproval.approvalId);
              }}
              size="sm"
              variant="ghost"
            >
              Reject
            </Button>
          </div>
        </div>
      )}
    </button>
  );
}

export { agentCardVariants };
