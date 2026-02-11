"use client";

import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useCallback, useState } from "react";
import { useTaskBoard } from "../hooks/use-task-board";
import { useTaskKeyboard } from "../hooks/use-task-keyboard";
import type { TaskItem, TaskStatus } from "../lib/task-board-utils";
import { TaskBoardColumn } from "./task-board-column";
import { TaskCard } from "./task-card";
import { TaskDetailPanel } from "./task-detail-panel";

type TaskBoardProps = {
  missionId: string;
  runId: string;
};

export function TaskBoard({ missionId, runId }: TaskBoardProps) {
  const {
    columns,
    tasks,
    selectedTaskId,
    selectTask,
    addTask,
    moveTask,
    deleteTask,
    setPriority,
  } = useTaskBoard(missionId, runId);

  const [showCreate, setShowCreate] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const detailTask = detailTaskId
    ? (tasks.find((t) => t.id === detailTaskId) ?? null)
    : null;

  useTaskKeyboard({
    enabled: !(showCreate || detailTaskId),
    columns,
    selectedTaskId,
    onSelectTask: selectTask,
    onOpenDetail: setDetailTaskId,
    onFocusCreate: () => setShowCreate(true),
    onDeleteTask: deleteTask,
    onSetPriority: setPriority,
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;
      if (!over) {
        return;
      }

      const taskId = String(active.id);
      const overId = String(over.id);

      const targetColumn = columns.find((col) => col.status === overId);
      if (targetColumn) {
        moveTask(taskId, targetColumn.status);
        return;
      }

      const targetTask = tasks.find((t) => t.id === overId);
      if (targetTask) {
        const targetCol = columns.find((col) =>
          col.tasks.some((t) => t.id === overId)
        );
        if (targetCol) {
          moveTask(taskId, targetCol.status as TaskStatus);
        }
      }
    },
    [columns, tasks, moveTask]
  );

  const activeTask: TaskItem | undefined = activeDragId
    ? tasks.find((t) => t.id === activeDragId)
    : undefined;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      <DndContext
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
      >
        {columns.map((column) => (
          <TaskBoardColumn
            column={column}
            key={column.status}
            onAddTask={addTask}
            onCancelCreate={() => setShowCreate(false)}
            onSelectTask={selectTask}
            onToggleCreate={() => setShowCreate(true)}
            selectedTaskId={selectedTaskId}
            showCreate={showCreate && column.status === "INBOX"}
          />
        ))}

        <DragOverlay>
          {activeTask && (
            <div className="w-56 opacity-80">
              <TaskCard
                isSelected={false}
                onClick={Function.prototype as () => void}
                task={activeTask}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <TaskDetailPanel
        agents={[]}
        isOpen={detailTaskId !== null}
        onClose={() => setDetailTaskId(null)}
        task={detailTask}
      />
    </div>
  );
}
