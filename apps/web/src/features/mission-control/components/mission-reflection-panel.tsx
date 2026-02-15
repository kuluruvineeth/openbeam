"use client";

import type {
  AgentHealthRow,
  MissionAgentLaneState,
} from "@openplane/types/mission-control";
import { Icons, ScrollArea } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  useAgentBoard,
  useHealthSnapshot,
  useStuckAgents,
} from "../stores/mission-runtime-store";

const healthStatusVariants = cva(
  "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px]",
  {
    variants: {
      status: {
        progressing:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        slow: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        stuck: "border-destructive/25 bg-destructive/10 text-destructive",
        escalated: "border-destructive/25 bg-destructive/10 text-destructive",
        completed: "border-border/50 bg-muted/40 text-muted-foreground",
        failed: "border-destructive/25 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: { status: "progressing" },
  }
);

type MissionReflectionPanelProps = {
  missionId: string;
};

function ScoreSparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) {
    return null;
  }

  const max = Math.max(...scores, 1);
  const width = 60;
  const height = 16;
  const step = width / (scores.length - 1);
  const points = scores
    .map((score, index) => `${index * step},${height - (score / max) * height}`)
    .join(" ");

  const lastScore = scores.at(-1) ?? 0;
  const previousScore = scores.at(-2) ?? lastScore;
  let trending: "up" | "down" | "flat" = "flat";
  if (lastScore > previousScore) {
    trending = "up";
  } else if (lastScore < previousScore) {
    trending = "down";
  }

  let strokeColor = "stroke-muted-foreground";
  if (trending === "up") {
    strokeColor = "stroke-emerald-500";
  } else if (trending === "down") {
    strokeColor = "stroke-destructive";
  }

  return (
    <svg
      aria-label="Score trend"
      className={cn("inline-block", strokeColor)}
      fill="none"
      height={height}
      role="img"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <polyline points={points} />
    </svg>
  );
}

function deriveHealthRows(
  agentBoard: Record<string, MissionAgentLaneState>
): AgentHealthRow[] {
  return Object.entries(agentBoard).map(([agentId, agent]) => {
    let healthStatus: AgentHealthRow["healthStatus"] = "progressing";
    if (agent.status === "completed") {
      healthStatus = "completed";
    } else if (agent.status === "failed") {
      healthStatus = "failed";
    } else if (agent.stuckReason) {
      healthStatus = "stuck";
    } else if (
      agent.reflectionScore !== null &&
      agent.reflectionScore !== undefined &&
      agent.reflectionScore < 0.3
    ) {
      healthStatus = "slow";
    }

    return {
      agentId,
      agentName: agent.agentName,
      progressScore: agent.reflectionScore ?? null,
      replanCount: agent.replanCount ?? 0,
      healthStatus,
      recentScores: [],
      stuckReason: agent.stuckReason ?? null,
      escalationReason: null,
    };
  });
}

export function MissionReflectionPanel({
  missionId,
}: MissionReflectionPanelProps) {
  const agentBoard = useAgentBoard();
  const healthSnapshot = useHealthSnapshot();
  const stuckAgents = useStuckAgents();

  const healthRows = useMemo(
    () => healthSnapshot?.agents ?? deriveHealthRows(agentBoard),
    [healthSnapshot, agentBoard]
  );
  const failurePatterns = healthSnapshot?.failurePatterns ?? [];

  return (
    <div className="flex h-full flex-col" data-mission-id={missionId}>
      <div className="flex items-center gap-2 border-border/50 border-b px-3 py-2 dark:border-border/30">
        <Icons.BrainCircuit className="text-muted-foreground" size={14} />
        <span className="font-medium text-xs">Health</span>
        {stuckAgents.length > 0 && (
          <span className="rounded-sm border border-destructive/25 bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive tabular-nums">
            {stuckAgents.length} stuck
          </span>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-3">
          <div>
            <p className="mb-2 text-[10px] text-muted-foreground uppercase tracking-wide">
              Agent Health ({healthRows.length})
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-border/40 border-b text-[10px] text-muted-foreground uppercase tracking-wide">
                    <th className="py-1.5 pr-3 text-left font-medium">Agent</th>
                    <th className="px-2 py-1.5 text-right font-medium">
                      Score
                    </th>
                    <th className="px-2 py-1.5 text-right font-medium">
                      Replans
                    </th>
                    <th className="px-2 py-1.5 text-left font-medium">
                      Status
                    </th>
                    <th className="py-1.5 pl-2 text-right font-medium">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {healthRows.map((row) => (
                    <tr className="border-border/30 border-b" key={row.agentId}>
                      <td className="max-w-[120px] truncate py-1.5 pr-3 font-medium">
                        {row.agentName}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                        {row.progressScore !== null
                          ? row.progressScore.toFixed(2)
                          : "--"}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                        {row.replanCount}
                      </td>
                      <td className="px-2 py-1.5">
                        <span
                          className={healthStatusVariants({
                            status: row.healthStatus,
                          })}
                        >
                          {row.healthStatus}
                        </span>
                      </td>
                      <td className="py-1.5 pl-2 text-right">
                        <ScoreSparkline scores={row.recentScores} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {failurePatterns.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] text-muted-foreground uppercase tracking-wide">
                Failure Patterns
              </p>
              <div className="flex flex-col gap-1">
                {failurePatterns.map((pattern, index) => (
                  <div
                    className="flex items-center gap-2 rounded-sm border border-border/40 px-2 py-1.5"
                    key={`${pattern.pattern}-${index}`}
                  >
                    <Icons.AlertCircle
                      className="shrink-0 text-destructive/60"
                      size={12}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {pattern.pattern}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">
                      {pattern.frequency}x
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {pattern.affectedAgents.length} agent
                      {pattern.affectedAgents.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stuckAgents.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] text-muted-foreground uppercase tracking-wide">
                Escalation Queue ({stuckAgents.length})
              </p>
              <div className="flex flex-col gap-1">
                {stuckAgents.map((agent) => (
                  <div
                    className="rounded-sm border border-amber-500/20 bg-amber-500/[0.02] px-2 py-1.5"
                    key={agent.agentId}
                  >
                    <div className="flex items-center gap-2">
                      <Icons.AlertTriangle
                        className="shrink-0 text-amber-500"
                        size={12}
                      />
                      <span className="font-medium text-xs">
                        {agent.agentName}
                      </span>
                    </div>
                    {agent.stuckReason && (
                      <p className="mt-0.5 pl-5 text-[11px] text-muted-foreground">
                        {agent.stuckReason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {healthRows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Icons.BrainCircuit
                className="mb-2 text-muted-foreground/40"
                size={24}
              />
              <span className="text-sm">No health data yet</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export { healthStatusVariants };
