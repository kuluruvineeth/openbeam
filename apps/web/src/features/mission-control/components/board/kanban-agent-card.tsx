"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { MissionAgentLaneState } from "@openplane/types/mission-control";
import { Icons } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { formatCents } from "../../lib/budget-utils";
import { AgentToolCallStrip } from "../agent-tool-call-strip";

const kanbanCardVariants = cva(
  "group flex cursor-grab flex-col gap-0.5 rounded-sm border px-2 py-1.5 text-left transition-all duration-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring active:cursor-grabbing",
  {
    variants: {
      status: {
        idle: "border-border/40 hover:bg-muted/30 dark:border-[#1d1d1d]",
        running: "border-primary/20 bg-primary/[0.02] hover:bg-primary/[0.04]",
        blocked:
          "border-amber-500/30 bg-amber-500/[0.02] hover:bg-amber-500/[0.04]",
        completed: "border-border/40 hover:bg-muted/30 dark:border-[#1d1d1d]",
        failed:
          "border-destructive/20 bg-destructive/[0.02] hover:bg-destructive/[0.04]",
      },
      selected: {
        true: "border-primary/50 bg-primary/[0.05] shadow-[inset_0_0_0_1px_rgba(59,130,246,0.22)]",
        false: "",
      },
      isDragging: {
        true: "opacity-40",
        false: "",
      },
    },
    defaultVariants: {
      status: "idle",
      selected: false,
      isDragging: false,
    },
  }
);

const STATUS_DOT_COLORS: Record<MissionAgentLaneState["status"], string> = {
  running: "bg-emerald-500",
  blocked: "bg-amber-500",
  failed: "bg-destructive",
  completed: "bg-primary/70",
  idle: "bg-muted-foreground/50",
};

type KanbanAgentCardProps = {
  agent: MissionAgentLaneState;
  isSelected: boolean;
  onSelect: (agentId: string | null) => void;
};

export function KanbanAgentCard({
  agent,
  isSelected,
  onSelect,
}: KanbanAgentCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: agent.agentId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  let progressLabel: string | null = null;
  if (agent.totalSteps && agent.totalSteps > 0) {
    progressLabel = `${agent.stepsCompleted}/${agent.totalSteps}`;
  } else if (agent.stepsCompleted > 0) {
    progressLabel = `${agent.stepsCompleted} steps`;
  }

  return (
    <button
      className={cn(
        kanbanCardVariants({
          status: agent.status,
          selected: isSelected,
          isDragging,
        })
      )}
      onClick={() => onSelect(isSelected ? null : agent.agentId)}
      ref={setNodeRef}
      style={style}
      type="button"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            STATUS_DOT_COLORS[agent.status],
            agent.status === "running" && "animate-pulse"
          )}
        />
        <span className="truncate font-medium text-xs">{agent.agentName}</span>
        {progressLabel && (
          <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">
            {progressLabel}
          </span>
        )}
      </div>

      {agent.currentTaskTitle && (
        <div className="flex items-center gap-1 pl-3">
          <Icons.CornerDownRight
            className="shrink-0 text-muted-foreground/40"
            size={9}
          />
          <span className="truncate text-[10px] text-muted-foreground">
            {agent.currentTaskTitle}
          </span>
        </div>
      )}

      {agent.recentToolCalls.length > 0 && (
        <div className="pl-3">
          <AgentToolCallStrip toolCalls={agent.recentToolCalls} />
        </div>
      )}

      <div className="flex items-center gap-1.5 pl-3 text-[10px] text-muted-foreground/80 tabular-nums">
        {agent.tokensUsed > 0 && (
          <span>{(agent.tokensUsed / 1000).toFixed(1)}k tok</span>
        )}
        {agent.costCents > 0 && <span>{formatCents(agent.costCents)}</span>}
      </div>
    </button>
  );
}

export { kanbanCardVariants };
