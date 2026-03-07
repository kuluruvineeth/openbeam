"use client";

import type { ControlProjectStatus } from "@openbeam/types/control";
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
import { PROJECT_STATUS_META } from "../../constants";
import { useCreateProject } from "../../hooks/use-control-projects";

const STATUS_OPTIONS = Object.entries(PROJECT_STATUS_META) as [
  ControlProjectStatus,
  { label: string },
][];

export function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ControlProjectStatus>("BACKLOG");
  const [targetDate, setTargetDate] = useState("");

  const createProject = useCreateProject();

  function reset() {
    setName("");
    setDescription("");
    setStatus("BACKLOG");
    setTargetDate("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }

    createProject.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        targetDate: targetDate || undefined,
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
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <Input
            autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            value={name}
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
              onValueChange={(v) => setStatus(v as ControlProjectStatus)}
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
            <Input
              className="h-8 flex-1 text-sm"
              onChange={(e) => setTargetDate(e.target.value)}
              placeholder="Target date"
              type="date"
              value={targetDate}
            />
          </div>
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
              disabled={!name.trim() || createProject.isPending}
              size="sm"
              type="submit"
            >
              {createProject.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
