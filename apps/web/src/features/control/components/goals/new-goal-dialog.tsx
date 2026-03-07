"use client";

import type { GoalLevel, GoalStatus } from "@openbeam/types/control";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@openbeam/ui";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { GOAL_STATUS_META } from "../../constants";
import { useControlGoals, useCreateGoal } from "../../hooks/use-control-goals";

const LEVEL_OPTIONS: { value: GoalLevel; label: string }[] = [
  { value: "COMPANY", label: "Company" },
  { value: "TEAM", label: "Team" },
  { value: "AGENT", label: "Agent" },
  { value: "TASK", label: "Task" },
];

const STATUS_OPTIONS = Object.entries(GOAL_STATUS_META) as [
  GoalStatus,
  { label: string },
][];

export function NewGoalDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<GoalLevel>("TASK");
  const [status, setStatus] = useState<GoalStatus>("PLANNED");
  const [parentId, setParentId] = useState<string>("");

  const createGoal = useCreateGoal();
  const { data: goals } = useControlGoals();

  const parentOptions = (goals ?? []).filter(
    (g: { id: string }) => g.id !== parentId
  );

  function reset() {
    setTitle("");
    setDescription("");
    setLevel("TASK");
    setStatus("PLANNED");
    setParentId("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      return;
    }

    createGoal.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        level,
        status,
        parentId: parentId || undefined,
      },
      {
        onSuccess: () => {
          reset();
          setOpen(false);
        },
      }
    );
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Icons.Plus size={14} />
          New Goal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Goal</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <Input
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Goal title"
            value={title}
          />
          <Textarea
            className="min-h-[80px] resize-none"
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
            value={description}
          />
          <div className="flex items-center gap-2">
            <Select
              onValueChange={(v) => setLevel(v as GoalLevel)}
              value={level}
            >
              <SelectTrigger className="h-8 flex-1 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              onValueChange={(v) => setStatus(v as GoalStatus)}
              value={status}
            >
              <SelectTrigger className="h-8 flex-1 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select onValueChange={setParentId} value={parentId}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Parent goal (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No parent</SelectItem>
              {parentOptions.map((g: { id: string; title: string }) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              onClick={() => setOpen(false)}
              size="sm"
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={!title.trim() || createGoal.isPending}
              size="sm"
              type="submit"
            >
              {createGoal.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
