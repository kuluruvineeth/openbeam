"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Icons } from "@openplane/ui";
import { cva } from "class-variance-authority";
import React from "react";
import { cn } from "@/lib/utils";
import type { TaskItem } from "../lib/task-board-utils";

const taskCardVariants = cva(
  "group relative flex cursor-grab flex-col gap-1 rounded-md border p-2.5 text-sm transition-colors active:cursor-grabbing",
  {
    variants: {
      priority: {
        P0: "border-destructive/30 bg-destructive/5",
        P1: "border-amber-500/30 bg-amber-500/5",
        P2: "border-border/50 bg-card",
        P3: "border-border/30 bg-card",
      },
      isDragging: {
        true: "opacity-50 shadow-sm",
        false: "",
      },
      isSelected: {
        true: "ring-1 ring-primary",
        false: "",
      },
    },
    defaultVariants: { priority: "P2", isDragging: false, isSelected: false },
  }
);

const priorityBadgeVariants = cva(
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

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type TaskCardProps = {
  task: TaskItem;
  isSelected: boolean;
  onClick: () => void;
};

export const TaskCard = React.memo(function TaskCardInner({
  task,
  isSelected,
  onClick,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: DnD kit sortable requires div wrapper, nested button prevents using <button>
    // biome-ignore lint/a11y/noStaticElementInteractions: DnD kit sortable provides role/tabIndex via {...attributes} spread
    <div
      className={cn(
        taskCardVariants({
          priority: task.priority,
          isDragging,
          isSelected,
        })
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      ref={setNodeRef}
      style={style}
      {...attributes}
    >
      <div className="flex items-center gap-1.5">
        <button
          aria-label="Drag handle"
          className="shrink-0 cursor-grab opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-60"
          ref={setActivatorNodeRef}
          type="button"
          {...listeners}
        >
          <Icons.GripVertical size={14} />
        </button>
        <span className={priorityBadgeVariants({ priority: task.priority })}>
          {task.priority}
        </span>
        <span className="truncate font-medium">{task.title}</span>
      </div>
      <div className="flex items-center gap-2 pl-5 text-muted-foreground text-xs">
        {task.assignedAgentName && (
          <span className="flex items-center gap-1 truncate">
            <Icons.BotIcon size={12} />
            {task.assignedAgentName}
          </span>
        )}
        <span className="ml-auto shrink-0 font-mono tabular-nums">
          {formatRelativeTime(task.createdAt)}
        </span>
      </div>
    </div>
  );
});

export { taskCardVariants, priorityBadgeVariants };
