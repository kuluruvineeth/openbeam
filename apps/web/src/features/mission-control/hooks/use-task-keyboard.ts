"use client";

import { useHotkeys } from "react-hotkeys-hook";
import type { KanbanColumn, TaskPriority } from "../lib/task-board-utils";

type UseTaskKeyboardOptions = {
  enabled: boolean;
  columns: KanbanColumn[];
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
  onOpenDetail: (id: string) => void;
  onFocusCreate: () => void;
  onDeleteTask: (id: string) => void;
  onSetPriority: (id: string, priority: TaskPriority) => void;
};

function findTaskLocation(
  columns: KanbanColumn[],
  taskId: string
): { colIndex: number; taskIndex: number } | null {
  for (let colIndex = 0; colIndex < columns.length; colIndex++) {
    const taskIndex = columns[colIndex].tasks.findIndex((t) => t.id === taskId);
    if (taskIndex !== -1) {
      return { colIndex, taskIndex };
    }
  }
  return null;
}

export function useTaskKeyboard({
  enabled,
  columns,
  selectedTaskId,
  onSelectTask,
  onOpenDetail,
  onFocusCreate,
  onDeleteTask,
  onSetPriority,
}: UseTaskKeyboardOptions) {
  useHotkeys(
    "j, ArrowDown",
    () => {
      if (!selectedTaskId) {
        const firstTask = columns[0]?.tasks[0];
        if (firstTask) {
          onSelectTask(firstTask.id);
        }
        return;
      }
      const loc = findTaskLocation(columns, selectedTaskId);
      if (!loc) {
        return;
      }
      const col = columns[loc.colIndex];
      const nextIndex = Math.min(loc.taskIndex + 1, col.tasks.length - 1);
      onSelectTask(col.tasks[nextIndex].id);
    },
    { enabled }
  );

  useHotkeys(
    "k, ArrowUp",
    () => {
      if (!selectedTaskId) {
        return;
      }
      const loc = findTaskLocation(columns, selectedTaskId);
      if (!loc) {
        return;
      }
      const col = columns[loc.colIndex];
      const prevIndex = Math.max(loc.taskIndex - 1, 0);
      onSelectTask(col.tasks[prevIndex].id);
    },
    { enabled }
  );

  useHotkeys(
    "h, ArrowLeft",
    () => {
      if (!selectedTaskId) {
        return;
      }
      const loc = findTaskLocation(columns, selectedTaskId);
      if (!loc || loc.colIndex === 0) {
        return;
      }
      const targetCol = columns[loc.colIndex - 1];
      const targetIndex = Math.min(loc.taskIndex, targetCol.tasks.length - 1);
      const target = targetCol.tasks[targetIndex];
      if (target) {
        onSelectTask(target.id);
      }
    },
    { enabled }
  );

  useHotkeys(
    "l, ArrowRight",
    () => {
      if (!selectedTaskId) {
        return;
      }
      const loc = findTaskLocation(columns, selectedTaskId);
      if (!loc || loc.colIndex === columns.length - 1) {
        return;
      }
      const targetCol = columns[loc.colIndex + 1];
      const targetIndex = Math.min(loc.taskIndex, targetCol.tasks.length - 1);
      const target = targetCol.tasks[targetIndex];
      if (target) {
        onSelectTask(target.id);
      }
    },
    { enabled }
  );

  useHotkeys(
    "Enter",
    () => {
      if (selectedTaskId) {
        onOpenDetail(selectedTaskId);
      }
    },
    { enabled }
  );

  useHotkeys("n", onFocusCreate, { enabled });

  useHotkeys(
    "d",
    () => {
      if (selectedTaskId) {
        onDeleteTask(selectedTaskId);
      }
    },
    { enabled }
  );

  useHotkeys(
    "1",
    () => {
      if (selectedTaskId) {
        onSetPriority(selectedTaskId, "P0");
      }
    },
    { enabled }
  );

  useHotkeys(
    "2",
    () => {
      if (selectedTaskId) {
        onSetPriority(selectedTaskId, "P1");
      }
    },
    { enabled }
  );

  useHotkeys(
    "3",
    () => {
      if (selectedTaskId) {
        onSetPriority(selectedTaskId, "P2");
      }
    },
    { enabled }
  );

  useHotkeys(
    "4",
    () => {
      if (selectedTaskId) {
        onSetPriority(selectedTaskId, "P3");
      }
    },
    { enabled }
  );
}
