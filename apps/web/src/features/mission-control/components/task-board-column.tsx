"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Icons } from "@openplane/ui";
import { cn } from "@/lib/utils";
import type { KanbanColumn, TaskPriority } from "../lib/task-board-utils";
import { TaskCard } from "./task-card";
import { TaskInlineCreate } from "./task-inline-create";

type TaskBoardColumnProps = {
  column: KanbanColumn;
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  showCreate?: boolean;
  onAddTask?: (title: string, priority: TaskPriority) => void;
  onToggleCreate?: () => void;
  onCancelCreate?: () => void;
};

export function TaskBoardColumn({
  column,
  selectedTaskId,
  onSelectTask,
  showCreate,
  onAddTask,
  onToggleCreate,
  onCancelCreate,
}: TaskBoardColumnProps) {
  const { setNodeRef } = useDroppable({ id: column.status });
  const taskIds = column.tasks.map((t) => t.id);

  return (
    <div className="flex w-56 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="font-medium text-muted-foreground text-xs">
          {column.label}
        </span>
        <span className="rounded-sm bg-muted px-1.5 font-mono text-muted-foreground text-xs tabular-nums">
          {column.tasks.length}
        </span>
      </div>
      <div
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-1.5 rounded-md bg-muted/30 p-1.5"
        )}
        ref={setNodeRef}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskCard
              isSelected={task.id === selectedTaskId}
              key={task.id}
              onClick={() => onSelectTask(task.id)}
              task={task}
            />
          ))}
        </SortableContext>
        {showCreate && onAddTask && onCancelCreate && (
          <TaskInlineCreate onCancel={onCancelCreate} onSubmit={onAddTask} />
        )}
        {column.status === "INBOX" && !showCreate && onToggleCreate && (
          <button
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
            onClick={onToggleCreate}
            type="button"
          >
            <Icons.Plus size={14} />
            <span>Add</span>
          </button>
        )}
      </div>
    </div>
  );
}
