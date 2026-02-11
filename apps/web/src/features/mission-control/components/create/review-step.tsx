"use client";

import { Badge, Icons } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { useState } from "react";
import { useMissionCreationStore } from "../../stores/mission-creation-store";

const OBJECTIVE_TRUNCATE_LENGTH = 200;

const laneBadgeVariants = cva(
  "inline-flex items-center rounded-sm px-1.5 py-0.5 font-medium font-mono text-[10px]",
  {
    variants: {
      lane: {
        linear: "bg-blue-500/10 text-blue-600",
        autonomous: "bg-emerald-500/10 text-emerald-600",
        hybrid: "bg-amber-500/10 text-amber-600",
      },
    },
  }
);

const reviewPriorityVariants = cva(
  "inline-flex items-center rounded-sm px-1 py-0.5 font-medium font-mono text-[10px]",
  {
    variants: {
      priority: {
        P0: "bg-destructive/15 text-destructive",
        P1: "bg-amber-500/15 text-amber-600",
        P2: "bg-muted text-muted-foreground",
        P3: "bg-muted/50 text-muted-foreground/70",
      },
    },
  }
);

function formatBudget(cents: number | null): string {
  if (cents === null) {
    return "No limit";
  }
  return `$${(cents / 100).toFixed(2)}`;
}

export function ReviewStep() {
  const objective = useMissionCreationStore((s) => s.objective);
  const lane = useMissionCreationStore((s) => s.lane);
  const budgetCents = useMissionCreationStore((s) => s.budgetCents);
  const agents = useMissionCreationStore((s) => s.agents);
  const tasks = useMissionCreationStore((s) => s.tasks);

  const [expanded, setExpanded] = useState(false);

  const shouldTruncate = objective.length > OBJECTIVE_TRUNCATE_LENGTH;
  const displayObjective =
    shouldTruncate && !expanded
      ? `${objective.slice(0, OBJECTIVE_TRUNCATE_LENGTH)}...`
      : objective;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5 rounded-md border border-border/50 p-3">
        <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
          Objective
        </span>
        <p className="whitespace-pre-wrap text-sm">{displayObjective}</p>
        {shouldTruncate && (
          <button
            className="self-start text-primary text-xs hover:underline"
            onClick={() => setExpanded(!expanded)}
            type="button"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 rounded-md border border-border/50 p-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
            Lane
          </span>
          <span className={laneBadgeVariants({ lane })}>{lane}</span>
        </div>
        <div className="h-8 w-px bg-border/50" />
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
            Budget
          </span>
          <span className="font-mono text-sm tabular-nums">
            {formatBudget(budgetCents)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-border/50 p-3">
        <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
          Squad ({agents.length})
        </span>
        <div className="flex flex-col gap-1.5">
          {agents.map((agent, index) => (
            <div className="flex items-center gap-2 text-sm" key={index}>
              <Icons.BotIcon
                className="shrink-0 text-muted-foreground"
                size={14}
              />
              <span className="font-medium">
                {agent.name || "Unnamed agent"}
              </span>
              <Badge className="text-[10px]" variant="outline">
                {agent.role}
              </Badge>
              <span className="ml-auto text-muted-foreground text-xs tabular-nums">
                {agent.tools.length} tools
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-border/50 p-3">
        <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
          Tasks ({tasks.length})
        </span>
        <div className="flex flex-col gap-1.5">
          {tasks.map((task, index) => (
            <div className="flex items-center gap-2 text-sm" key={index}>
              <span
                className={reviewPriorityVariants({
                  priority: task.priority,
                })}
              >
                {task.priority}
              </span>
              <span className="truncate">{task.title || "Untitled task"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { laneBadgeVariants, reviewPriorityVariants };
