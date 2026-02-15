"use client";

import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { MissionAgentLaneState } from "@openplane/types/mission-control";
import { Icons } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { useCallback, useMemo, useState } from "react";
import { useAgentBoard } from "../../stores/mission-runtime-store";
import { KanbanDragOverlay } from "./kanban-drag-overlay";
import { KanbanStatusColumn } from "./kanban-status-column";

const KANBAN_COLUMNS = [
  { id: "running", label: "Running", icon: Icons.Play },
  { id: "blocked", label: "Blocked", icon: Icons.Pause },
  { id: "idle", label: "Idle", icon: Icons.Clock },
  { id: "completed", label: "Done", icon: Icons.Check },
  { id: "failed", label: "Failed", icon: Icons.AlertCircle },
] as const;

type KanbanColumnId = (typeof KANBAN_COLUMNS)[number]["id"];

const ALL_COLUMN_IDS = new Set<KanbanColumnId>(KANBAN_COLUMNS.map((c) => c.id));

export const kanbanFilterVariants = cva(
  "flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] transition-colors",
  {
    variants: {
      active: {
        true: "border-primary/30 bg-primary/5 font-medium text-foreground",
        false: "border-transparent text-muted-foreground hover:bg-muted/50",
      },
    },
    defaultVariants: { active: false },
  }
);

function groupAgentsByStatus(
  agentBoard: Record<string, MissionAgentLaneState>
): Record<KanbanColumnId, MissionAgentLaneState[]> {
  const groups: Record<KanbanColumnId, MissionAgentLaneState[]> = {
    running: [],
    blocked: [],
    idle: [],
    completed: [],
    failed: [],
  };

  for (const agent of Object.values(agentBoard)) {
    const column = groups[agent.status as KanbanColumnId];
    if (column) {
      column.push(agent);
    }
  }

  return groups;
}

type MissionKanbanBoardProps = {
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string | null) => void;
};

export function MissionKanbanBoard({
  selectedAgentId,
  onSelectAgent,
}: MissionKanbanBoardProps) {
  const agentBoard = useAgentBoard();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] =
    useState<Set<KanbanColumnId>>(ALL_COLUMN_IDS);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const columns = useMemo(() => groupAgentsByStatus(agentBoard), [agentBoard]);

  const activeAgent = activeId ? agentBoard[activeId] : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback((_event: DragEndEvent) => {
    setActiveId(null);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const allActive = visibleColumns.size === KANBAN_COLUMNS.length;

  const toggleColumn = useCallback((id: KanbanColumnId) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next.size === 0 ? ALL_COLUMN_IDS : next;
    });
  }, []);

  const resetColumns = useCallback(() => {
    setVisibleColumns(ALL_COLUMN_IDS);
  }, []);

  return (
    <div className="flex h-full flex-col border-border/50 border-l dark:border-[#1d1d1d]">
      <div className="flex items-center gap-2 border-border/50 border-b px-3 py-1.5 dark:border-[#1d1d1d]">
        <Icons.LayoutGrid className="text-muted-foreground" size={13} />
        <span className="font-medium text-xs">Board</span>
        <span className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[10px] tabular-nums">
          {Object.keys(agentBoard).length}
        </span>
      </div>

      <div className="flex items-center gap-1 border-border/50 border-b px-3 py-1 dark:border-[#1d1d1d]">
        <button
          className={kanbanFilterVariants({ active: allActive })}
          onClick={resetColumns}
          type="button"
        >
          All
        </button>
        {KANBAN_COLUMNS.map((col) => (
          <button
            className={kanbanFilterVariants({
              active: !allActive && visibleColumns.has(col.id),
            })}
            key={col.id}
            onClick={() => toggleColumn(col.id)}
            type="button"
          >
            {col.label}
            <span className="rounded-sm bg-muted px-1 font-mono text-[10px] tabular-nums">
              {columns[col.id].length}
            </span>
          </button>
        ))}
      </div>

      <DndContext
        collisionDetection={closestCorners}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto p-2">
          {KANBAN_COLUMNS.filter((col) => visibleColumns.has(col.id)).map(
            (col) => (
              <KanbanStatusColumn
                agents={columns[col.id]}
                columnId={col.id}
                icon={col.icon}
                key={col.id}
                label={col.label}
                onSelectAgent={onSelectAgent}
                selectedAgentId={selectedAgentId}
              />
            )
          )}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeAgent && <KanbanDragOverlay agent={activeAgent} />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
