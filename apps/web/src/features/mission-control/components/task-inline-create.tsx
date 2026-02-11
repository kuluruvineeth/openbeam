"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openplane/ui";
import { useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type { TaskPriority } from "../lib/task-board-utils";

const PRIORITIES: TaskPriority[] = ["P0", "P1", "P2", "P3"];

type TaskInlineCreateProps = {
  onSubmit: (title: string, priority: TaskPriority) => void;
  onCancel: () => void;
};

export function TaskInlineCreate({
  onSubmit,
  onCancel,
}: TaskInlineCreateProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("P2");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    onSubmit(trimmed, priority);
    setTitle("");
    setPriority("P2");
    inputRef.current?.focus();
  };

  useHotkeys("escape", onCancel, { enableOnFormTags: true });

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border/50 border-dashed p-1.5">
      <Select
        onValueChange={(v) => setPriority(v as TaskPriority)}
        value={priority}
      >
        <SelectTrigger className="h-7 w-14 shrink-0 border-none px-1.5 font-mono text-[10px] shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRIORITIES.map((p) => (
            <SelectItem className="font-mono text-xs" key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input
        autoFocus
        className="h-7 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="Task title..."
        ref={inputRef}
        type="text"
        value={title}
      />
    </div>
  );
}
