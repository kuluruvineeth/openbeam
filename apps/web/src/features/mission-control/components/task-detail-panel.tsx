"use client";

import {
  Badge,
  Icons,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
} from "@openplane/ui";
import { useEffect, useState } from "react";
import type {
  TaskItem,
  TaskPriority,
  TaskStatus,
} from "../lib/task-board-utils";

const PRIORITIES: TaskPriority[] = ["P0", "P1", "P2", "P3"];

const STATUS_LABELS: Record<TaskStatus, string> = {
  INBOX: "Inbox",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  DONE: "Done",
};

function formatTimestamp(ts: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ts));
}

type Agent = { id: string; name: string };

type TaskDetailPanelProps = {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
  agents: Agent[];
};

export function TaskDetailPanel({
  task,
  isOpen,
  onClose,
  agents,
}: TaskDetailPanelProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
    }
  }, [task]);

  return (
    <Sheet onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <SheetContent
        className="flex flex-col gap-6 overflow-y-auto sm:max-w-md"
        side="right"
      >
        <SheetHeader>
          <SheetTitle className="sr-only">Task Detail</SheetTitle>
          <SheetDescription className="sr-only">
            View and edit task details
          </SheetDescription>
        </SheetHeader>

        {task && (
          <>
            <input
              className="border-none bg-transparent font-semibold text-base outline-none placeholder:text-muted-foreground/50"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              type="text"
              value={title}
            />

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground text-xs">
                  Status
                </span>
                <Badge className="font-mono text-[10px]" variant="outline">
                  {STATUS_LABELS[task.status]}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground text-xs">
                  Priority
                </span>
                <Select defaultValue={task.priority}>
                  <SelectTrigger className="h-7 w-16 border-none px-2 font-mono text-xs shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem
                        className="font-mono text-xs"
                        key={p}
                        value={p}
                      >
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground text-xs">
                  Agent
                </span>
                <Select defaultValue={task.assignedAgentId ?? "unassigned"}>
                  <SelectTrigger className="h-7 w-36 border-none px-2 text-xs shadow-none">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem className="text-xs" value="unassigned">
                      Unassigned
                    </SelectItem>
                    {agents.map((agent) => (
                      <SelectItem
                        className="text-xs"
                        key={agent.id}
                        value={agent.id}
                      >
                        <span className="flex items-center gap-1.5">
                          <Icons.BotIcon size={12} />
                          {agent.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-medium text-muted-foreground text-xs">
                Description
              </span>
              <Textarea
                className="min-h-[100px] resize-none border-border/50 text-sm"
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                value={description}
              />
            </div>

            <div className="mt-auto flex flex-col gap-1 border-border/50 border-t pt-4 font-mono text-[11px] text-muted-foreground tabular-nums">
              <div className="flex justify-between">
                <span>Created</span>
                <span>{formatTimestamp(task.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Updated</span>
                <span>{formatTimestamp(task.updatedAt)}</span>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
