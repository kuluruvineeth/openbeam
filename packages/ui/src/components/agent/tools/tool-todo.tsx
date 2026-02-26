"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "../../../utils/cn";
import { Icons } from "../../icons";
import { TextShimmer } from "../../text-shimmer";

const toolTodoVariants = cva("rounded-md border text-sm", {
  variants: {
    status: {
      pending: "border-border/50 bg-muted/30",
      running: "border-primary/30 bg-muted/30",
      success: "border-border/50 bg-muted/30",
      error: "border-destructive/30 bg-destructive/5",
    },
  },
  defaultVariants: {
    status: "pending",
  },
});

const todoItemVariants = cva("flex items-start gap-2 px-3 py-1.5", {
  variants: {
    itemStatus: {
      pending: "text-muted-foreground",
      in_progress: "text-foreground",
      completed: "text-muted-foreground",
    },
  },
  defaultVariants: {
    itemStatus: "pending",
  },
});

type ToolTodoStatus = "pending" | "running" | "success" | "error";
type TodoItemStatus = "pending" | "in_progress" | "completed";

interface TodoItem {
  content: string;
  status: TodoItemStatus;
  activeForm?: string;
}

type ToolTodoProps = React.ComponentProps<"div"> &
  VariantProps<typeof toolTodoVariants> & {
    todos: TodoItem[];
    status?: ToolTodoStatus;
  };

const ToolTodo = forwardRef<HTMLDivElement, ToolTodoProps>(
  ({ className, todos, status = "pending", ...props }, ref) => {
    const completedCount = todos.filter((t) => t.status === "completed").length;
    const totalCount = todos.length;

    const renderStatusIndicator = () => {
      if (status === "running") {
        return (
          <Icons.Circle className="size-2 animate-pulse fill-primary text-primary" />
        );
      }
      if (status === "success") {
        return (
          <Icons.Circle className="size-2 fill-green-500 text-green-500" />
        );
      }
      if (status === "error") {
        return (
          <Icons.Circle className="size-2 fill-destructive text-destructive" />
        );
      }
      return (
        <Icons.Circle className="size-2 fill-muted-foreground/50 text-muted-foreground/50" />
      );
    };

    const renderTodoIcon = (itemStatus: TodoItemStatus) => {
      if (itemStatus === "completed") {
        return (
          <div className="flex size-4 items-center justify-center rounded-full bg-green-500/20">
            <Icons.Check className="size-2.5 text-green-500" />
          </div>
        );
      }
      if (itemStatus === "in_progress") {
        return (
          <div className="flex size-4 items-center justify-center rounded-full bg-primary/20">
            <Icons.Loader2 className="size-2.5 animate-spin text-primary" />
          </div>
        );
      }
      return (
        <div className="size-4 rounded-full border border-muted-foreground/30" />
      );
    };

    const renderHeader = () => (
      <div className="flex items-center gap-2 border-border/30 border-b px-3 py-2">
        <Icons.List className="size-3.5 text-muted-foreground" />
        {status === "running" ? (
          <TextShimmer as="span" className="font-medium text-xs" duration={1.5}>
            Updating todos...
          </TextShimmer>
        ) : (
          <span className="text-muted-foreground text-xs">Tasks</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-muted-foreground text-xs tabular-nums">
            {completedCount}/{totalCount}
          </span>
          {renderStatusIndicator()}
        </div>
      </div>
    );

    const renderTodoItem = (todo: TodoItem, index: number) => {
      const isInProgress = todo.status === "in_progress";
      const displayText =
        isInProgress && todo.activeForm ? todo.activeForm : todo.content;

      return (
        <div
          className={cn(
            todoItemVariants({ itemStatus: todo.status }),
            todo.status === "completed" && "line-through opacity-60"
          )}
          key={`${todo.content.slice(0, 32)}-${index}`}
        >
          <div className="mt-0.5">{renderTodoIcon(todo.status)}</div>
          <span className="flex-1">
            {isInProgress ? (
              <TextShimmer as="span" duration={1.5}>
                {displayText}
              </TextShimmer>
            ) : (
              displayText
            )}
          </span>
        </div>
      );
    };

    return (
      <div
        className={cn(toolTodoVariants({ status }), className)}
        ref={ref}
        {...props}
      >
        {renderHeader()}
        <div className="py-1">
          {todos.map((todo, i) => renderTodoItem(todo, i))}
        </div>
        {totalCount > 0 && (
          <div className="border-border/30 border-t bg-muted/20 px-3 py-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }
);
ToolTodo.displayName = "ToolTodo";

export { ToolTodo, toolTodoVariants, todoItemVariants };
export type { ToolTodoProps, ToolTodoStatus, TodoItem, TodoItemStatus };
