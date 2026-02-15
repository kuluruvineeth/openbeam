"use client";

import type { MissionAgentLaneState } from "@openplane/types/mission-control";

type KanbanDragOverlayProps = {
  agent: MissionAgentLaneState;
};

export function KanbanDragOverlay({ agent }: KanbanDragOverlayProps) {
  return (
    <div className="flex flex-col gap-0.5 rounded-sm border border-primary/40 bg-background px-2 py-1.5 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        <span className="truncate font-medium text-xs">{agent.agentName}</span>
      </div>
      {agent.currentTaskTitle && (
        <span className="truncate pl-3 text-[10px] text-muted-foreground">
          {agent.currentTaskTitle}
        </span>
      )}
    </div>
  );
}
