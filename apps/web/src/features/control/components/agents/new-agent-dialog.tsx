"use client";

import {
  CONTROL_AGENT_ADAPTER_TYPES,
  CONTROL_AGENT_ROLES,
} from "@openbeam/types/control";
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
} from "@openbeam/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCreateAgent } from "../../hooks/use-control-agents";

type NewAgentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FormState = {
  name: string;
  role: string;
  title: string;
  adapterType: string;
};

const INITIAL_FORM: FormState = {
  name: "",
  role: "general",
  title: "",
  adapterType: "PROCESS",
};

export function NewAgentDialog({ open, onOpenChange }: NewAgentDialogProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const createMutation = useCreateAgent();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      return;
    }

    createMutation.mutate(
      {
        name: form.name.trim(),
        role: form.role as (typeof CONTROL_AGENT_ROLES)[number],
        title: form.title.trim() || null,
        adapterType:
          form.adapterType as (typeof CONTROL_AGENT_ADAPTER_TYPES)[number],
      },
      {
        onSuccess: (agent) => {
          setForm(INITIAL_FORM);
          onOpenChange(false);
          router.push(`/control/agents/${agent.id}`);
        },
      }
    );
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Agent</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="space-y-1">
              <label className="font-medium text-xs" htmlFor="agent-name">
                Name
              </label>
              <Input
                id="agent-name"
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. code-reviewer"
                value={form.name}
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-xs" htmlFor="agent-title">
                Title
              </label>
              <Input
                id="agent-title"
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="e.g. Senior Code Reviewer"
                value={form.title}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="font-medium text-xs">Role</span>
                <Select
                  onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
                  value={form.role}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTROL_AGENT_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <span className="font-medium text-xs">Adapter</span>
                <Select
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, adapterType: v }))
                  }
                  value={form.adapterType}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTROL_AGENT_ADAPTER_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
              disabled={!form.name.trim() || createMutation.isPending}
              type="submit"
            >
              {createMutation.isPending ? "Creating..." : "Create Agent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
