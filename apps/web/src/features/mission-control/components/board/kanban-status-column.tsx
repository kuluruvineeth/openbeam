"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { MissionAgentLaneState } from "@openplane/types/mission-control";
import { cva } from "class-variance-authority";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { KanbanAgentCard } from "./kanban-agent-card";

const columnVariants = cva(
  "flex min-w-[220px] flex-1 flex-col rounded-sm border",
  {
    variants: {
      status: {
        running: "border-emerald-500/20 bg-emerald-500/[0.02]",
        blocked: "border-amber-500/20 bg-amber-500/[0.02]",
        idle: "border-border/40 bg-background",
        completed: "border-border/40 bg-background",
        failed: "border-destructive/20 bg-destructive/[0.02]",
      },
      isOver: {
        true: "ring-1 ring-primary/40",
        false: "",
      },
    },
    defaultVariants: { status: "idle", isOver: false },
  }
);

const columnHeaderVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px]",
  {
    variants: {
      status: {
        running:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        blocked:
          "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        idle: "border-border/60 bg-muted/40 text-muted-foreground",
        completed: "border-border/60 bg-muted/40 text-muted-foreground",
        failed: "border-destructive/25 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: { status: "idle" },
  }
);

type KanbanStatusColumnProps = {
  columnId: string;
  label: string;
  icon: ComponentType<{ size: number }>;
  agents: MissionAgentLaneState[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string | null) => void;
};

export function KanbanStatusColumn({
  columnId,
  label,
  icon: StatusIcon,
  agents,
  selectedAgentId,
  onSelectAgent,
}: KanbanStatusColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  const agentIds = agents.map((a) => a.agentId);

  return (
    <div
      className={cn(
        columnVariants({
          status: columnId as MissionAgentLaneState["status"],
          isOver,
        })
      )}
      ref={setNodeRef}
    >
      <div className="flex items-center gap-1.5 border-border/30 border-b px-2 py-1.5">
        <StatusIcon size={12} />
        <span className="font-medium text-[11px]">{label}</span>
        <span
          className={cn(
            columnHeaderVariants({
              status: columnId as MissionAgentLaneState["status"],
            })
          )}
        >
          {agents.length}
        </span>
      </div>

      <SortableContext items={agentIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1 p-1.5">
          {agents.map((agent) => (
            <KanbanAgentCard
              agent={agent}
              isSelected={selectedAgentId === agent.agentId}
              key={agent.agentId}
              onSelect={onSelectAgent}
            />
          ))}

          {agents.length === 0 && (
            <div className="py-4 text-center text-[10px] text-muted-foreground/60">
              No agents
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export { columnVariants, columnHeaderVariants };
