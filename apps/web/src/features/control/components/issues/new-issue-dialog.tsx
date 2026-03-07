"use client";

import type { ControlIssuePriority } from "@openbeam/types/control";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@openbeam/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useCreateIssue } from "../../hooks/use-control-issues";

const PRIORITIES: ControlIssuePriority[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
];

type NewIssueDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewIssueDialog({ open, onOpenChange }: NewIssueDialogProps) {
  const trpc = useTRPC();
  const createIssue = useCreateIssue();

  const { data: agents } = useQuery({
    ...trpc.control.agents.list.queryOptions({ limit: 50 }),
    enabled: open,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ControlIssuePriority>("MEDIUM");
  const [assigneeAgentId, setAssigneeAgentId] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      return;
    }

    createIssue.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assigneeAgentId: assigneeAgentId || undefined,
      },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
          setPriority("MEDIUM");
          setAssigneeAgentId("");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Issue</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <Input
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Issue title"
            value={title}
          />
          <Textarea
            className="min-h-[80px] resize-none text-sm"
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
            value={description}
          />
          <div className="flex gap-2">
            <Select
              onValueChange={(v) => setPriority(v as ControlIssuePriority)}
              value={priority}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={setAssigneeAgentId} value={assigneeAgentId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Assignee (optional)" />
              </SelectTrigger>
              <SelectContent>
                {(agents ?? []).map((agent: { id: string; name: string }) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={!title.trim() || createIssue.isPending}
              type="submit"
            >
              {createIssue.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
