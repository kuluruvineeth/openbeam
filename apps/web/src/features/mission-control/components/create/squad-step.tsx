"use client";

import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Icons,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openplane/ui";
import { cva } from "class-variance-authority";
import { useState } from "react";
import { useMissionCreationStore } from "../../stores/mission-creation-store";
import { SoulPromptEditor } from "./soul-prompt-editor";
import { ToolPicker } from "./tool-picker";

const agentCardVariants = cva(
  "flex flex-col gap-3 rounded-md border p-3 transition-colors",
  {
    variants: {
      expanded: {
        true: "border-border bg-card",
        false: "border-border/50 bg-card/50",
      },
    },
    defaultVariants: { expanded: false },
  }
);

const ROLE_OPTIONS = [
  { value: "coordinator", label: "Lead" },
  { value: "specialist", label: "Specialist" },
  { value: "reviewer", label: "Reviewer" },
];

type AgentCardProps = {
  index: number;
};

function AgentCard({ index }: AgentCardProps) {
  const [open, setOpen] = useState(false);
  const agent = useMissionCreationStore((s) => s.agents[index]);
  const updateAgent = useMissionCreationStore((s) => s.updateAgent);
  const removeAgent = useMissionCreationStore((s) => s.removeAgent);

  if (!agent) {
    return null;
  }

  return (
    <Collapsible onOpenChange={setOpen} open={open}>
      <div className={agentCardVariants({ expanded: open })}>
        <div className="flex items-start gap-2">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 flex-col gap-1">
              <Label className="text-[10px]" htmlFor={`agent-name-${index}`}>
                Name
              </Label>
              <Input
                className="h-8 text-sm"
                id={`agent-name-${index}`}
                onChange={(e) => updateAgent(index, { name: e.target.value })}
                placeholder="Agent name"
                value={agent.name}
              />
            </div>
            <div className="flex w-32 flex-col gap-1">
              <Label className="text-[10px]">Role</Label>
              <Select
                onValueChange={(value) => updateAgent(index, { role: value })}
                value={agent.role}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem
                      className="text-sm"
                      key={role.value}
                      value={role.value}
                    >
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-1 pt-4">
            <CollapsibleTrigger asChild>
              <button
                className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                type="button"
              >
                <Icons.ChevronDown
                  className={`transition-transform duration-150 ${open ? "rotate-0" : "-rotate-90"}`}
                  size={14}
                />
              </button>
            </CollapsibleTrigger>
            <button
              className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              onClick={() => removeAgent(index)}
              type="button"
            >
              <Icons.Trash size={14} />
            </button>
          </div>
        </div>

        <CollapsibleContent>
          <div className="flex flex-col gap-4 border-border/30 border-t pt-3">
            <SoulPromptEditor
              onChange={(value) => updateAgent(index, { soulPrompt: value })}
              value={agent.soulPrompt}
            />
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Tools</Label>
              <ToolPicker
                onChange={(tools) => updateAgent(index, { tools })}
                selected={agent.tools}
              />
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function SquadStep() {
  const agentCount = useMissionCreationStore((s) => s.agents.length);
  const addAgent = useMissionCreationStore((s) => s.addAgent);

  const indices = Array.from({ length: agentCount }, (_, i) => i);

  function handleAddAgent() {
    addAgent({
      name: "",
      role: "specialist",
      soulPrompt: "",
      tools: [],
      capabilities: [],
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {indices.map((index) => (
        <AgentCard index={index} key={index} />
      ))}

      <Button
        className="self-start"
        onClick={handleAddAgent}
        size="sm"
        variant="outline"
      >
        <Icons.Plus size={14} />
        Add Agent
      </Button>
    </div>
  );
}

export { agentCardVariants };
