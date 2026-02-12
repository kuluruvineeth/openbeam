"use client";

import {
  Button,
  Icons,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openplane/ui";
import { cva } from "class-variance-authority";
import type { TaskDraft } from "../../stores/mission-creation-store";
import { useMissionCreationStore } from "../../stores/mission-creation-store";

const PRIORITIES = ["P0", "P1", "P2", "P3"] as const;

const taskDraftCardVariants = cva(
  "flex items-center gap-2 rounded-md border p-2.5 text-sm transition-colors",
  {
    variants: {
      priority: {
        P0: "border-destructive/30 bg-destructive/5",
        P1: "border-amber-500/30 bg-amber-500/5",
        P2: "border-border/50 bg-card",
        P3: "border-border/30 bg-card",
      },
    },
    defaultVariants: { priority: "P2" },
  }
);

const taskPriorityBadgeVariants = cva(
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

type TaskCardRowProps = {
  task: TaskDraft;
  index: number;
};

function TaskCardRow({ task, index }: TaskCardRowProps) {
  const updateTask = useMissionCreationStore((s) => s.updateTask);
  const removeTask = useMissionCreationStore((s) => s.removeTask);

  return (
    <div className={taskDraftCardVariants({ priority: task.priority })}>
      <span className="shrink-0 text-muted-foreground/40">
        <Icons.GripVertical size={14} />
      </span>

      <Input
        className="h-7 flex-1 border-none bg-transparent px-1 text-sm shadow-none"
        onChange={(e) => updateTask(index, { title: e.target.value })}
        placeholder="Task title"
        value={task.title}
      />

      <Select
        onValueChange={(value) =>
          updateTask(index, {
            priority: value as TaskDraft["priority"],
          })
        }
        value={task.priority}
      >
        <SelectTrigger className="h-7 w-16 border-none px-1.5 shadow-none">
          <span
            className={taskPriorityBadgeVariants({ priority: task.priority })}
          >
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent>
          {PRIORITIES.map((p) => (
            <SelectItem className="font-mono text-xs" key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button
        className="shrink-0 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        onClick={() => removeTask(index)}
        type="button"
      >
        <Icons.Trash size={14} />
      </button>
    </div>
  );
}

export function TaskStep() {
  const tasks = useMissionCreationStore((s) => s.tasks);
  const addTask = useMissionCreationStore((s) => s.addTask);

  function handleAddTask() {
    addTask({
      title: "",
      description: "",
      priority: "P2",
      dependsOn: [],
      requiredCapabilities: [],
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {tasks.map((task, index) => (
        <TaskCardRow index={index} key={index} task={task} />
      ))}

      <Button
        className="self-start"
        onClick={handleAddTask}
        size="sm"
        variant="outline"
      >
        <Icons.Plus size={14} />
        Add Task
      </Button>
    </div>
  );
}

export { taskDraftCardVariants, taskPriorityBadgeVariants };
