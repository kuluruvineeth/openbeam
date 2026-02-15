"use client";

import {
  SWARM_PRESETS,
  type SwarmPresetId,
} from "@openplane/types/temporal/mission";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Icons,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScheduleBuilder,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from "@openplane/ui";
import { cva } from "class-variance-authority";
import { useEffect, useRef, useState } from "react";
import { useMissionCreationStore } from "../../stores/mission-creation-store";
import { MISSION_TEMPLATES, templateCardVariants } from "./template-picker";

const OBJECTIVE_CHAR_LIMIT = 5000;

const laneToggleVariants = cva(
  "flex flex-1 flex-col items-start gap-0.5 rounded-sm border px-3 py-2 text-left text-xs transition-colors",
  {
    variants: {
      active: {
        true: "border-primary bg-primary/5 text-foreground",
        false:
          "border-border/50 text-muted-foreground hover:border-border hover:bg-muted/50",
      },
    },
    defaultVariants: { active: false },
  }
);

const LANE_OPTIONS = [
  {
    value: "linear" as const,
    label: "Linear",
    description: "Sequential execution",
  },
  {
    value: "autonomous" as const,
    label: "Autonomous",
    description: "Agents decide order",
  },
  {
    value: "hybrid" as const,
    label: "Hybrid",
    description: "Mix of both",
  },
];

const CONCURRENCY_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

export function ObjectiveStep() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [executionOpen, setExecutionOpen] = useState(false);

  const objective = useMissionCreationStore((s) => s.objective);
  const templateId = useMissionCreationStore((s) => s.templateId);
  const lane = useMissionCreationStore((s) => s.lane);
  const swarmPresetId = useMissionCreationStore((s) => s.swarmPresetId);
  const budgetCents = useMissionCreationStore((s) => s.budgetCents);
  const maxConcurrentRuns = useMissionCreationStore((s) => s.maxConcurrentRuns);
  const cronSchedule = useMissionCreationStore((s) => s.cronSchedule);
  const setObjective = useMissionCreationStore((s) => s.setObjective);
  const setLane = useMissionCreationStore((s) => s.setLane);
  const setSwarmPreset = useMissionCreationStore((s) => s.setSwarmPreset);
  const setBudgetCents = useMissionCreationStore((s) => s.setBudgetCents);
  const setMaxConcurrentRuns = useMissionCreationStore(
    (s) => s.setMaxConcurrentRuns
  );
  const setCronSchedule = useMissionCreationStore((s) => s.setCronSchedule);
  const applyTemplate = useMissionCreationStore((s) => s.applyTemplate);

  useEffect(() => {
    const timer = setTimeout(() => textareaRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const budgetDollars =
    budgetCents !== null ? (budgetCents / 100).toString() : "";

  function handleBudgetChange(value: string) {
    if (value === "") {
      setBudgetCents(null);
      return;
    }
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      setBudgetCents(Math.round(parsed * 100));
    }
  }

  function handleLaneChange(value: string) {
    if (value === "linear" || value === "autonomous" || value === "hybrid") {
      setLane(value);
    }
  }

  const appliedTemplate = templateId
    ? MISSION_TEMPLATES.find((t) => t.id === templateId)
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs" htmlFor="objective">
            Objective
          </Label>
          <Popover onOpenChange={setTemplateOpen} open={templateOpen}>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
                type="button"
              >
                <Icons.FileText size={12} />
                {appliedTemplate ? appliedTemplate.name : "Use template"}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-2" sideOffset={4}>
              <div className="flex flex-col gap-1">
                {MISSION_TEMPLATES.map((template) => (
                  <button
                    className={templateCardVariants({
                      selected: templateId === template.id,
                    })}
                    key={template.id}
                    onClick={() => {
                      applyTemplate(template);
                      setTemplateOpen(false);
                    }}
                    type="button"
                  >
                    <span className="font-medium text-xs">{template.name}</span>
                    <span className="line-clamp-1 text-[10px] text-muted-foreground">
                      {template.description}
                    </span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <Textarea
          className="min-h-[140px] resize-none text-sm"
          id="objective"
          maxLength={OBJECTIVE_CHAR_LIMIT}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="Describe what this mission should accomplish..."
          ref={textareaRef}
          value={objective}
        />
        <span className="self-end text-[10px] text-muted-foreground tabular-nums">
          {objective.length}/{OBJECTIVE_CHAR_LIMIT}
        </span>
      </div>

      <Collapsible onOpenChange={setExecutionOpen} open={executionOpen}>
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full items-center justify-between rounded-sm px-1 py-1.5 text-muted-foreground text-xs transition-colors hover:text-foreground"
            type="button"
          >
            <span className="flex items-center gap-1.5">
              <Icons.Settings2 size={12} />
              Execution settings
            </span>
            <Icons.ChevronDown
              className={`transition-transform duration-150 ${executionOpen ? "rotate-180" : ""}`}
              size={12}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Swarm Size</Label>
              <div className="flex gap-1.5">
                {(
                  Object.values(
                    SWARM_PRESETS
                  ) as (typeof SWARM_PRESETS)[SwarmPresetId][]
                ).map((preset) => (
                  <button
                    className={laneToggleVariants({
                      active: swarmPresetId === preset.id,
                    })}
                    key={preset.id}
                    onClick={() => setSwarmPreset(preset.id)}
                    type="button"
                  >
                    <span className="font-medium">{preset.label}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {preset.description}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      ${(preset.budgetCents / 100).toFixed(0)} budget
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Execution Lane</Label>
              <div className="flex gap-1.5">
                {LANE_OPTIONS.map((option) => (
                  <button
                    className={laneToggleVariants({
                      active: lane === option.value,
                    })}
                    key={option.value}
                    onClick={() => handleLaneChange(option.value)}
                    type="button"
                  >
                    <span className="font-medium">{option.label}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs" htmlFor="budget">
                  Budget (optional)
                </Label>
                <div className="relative">
                  <span className="-translate-y-1/2 absolute top-1/2 left-2.5 text-muted-foreground text-xs">
                    $
                  </span>
                  <Input
                    className="pl-6 text-sm tabular-nums"
                    id="budget"
                    min={0}
                    onChange={(e) => handleBudgetChange(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={budgetDollars}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs" htmlFor="concurrency">
                  Max Concurrency
                </Label>
                <Select
                  onValueChange={(v) => setMaxConcurrentRuns(Number(v))}
                  value={String(maxConcurrentRuns)}
                >
                  <SelectTrigger className="text-sm" id="concurrency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONCURRENCY_OPTIONS.map((n) => (
                      <SelectItem className="text-sm" key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs" htmlFor="schedule-toggle">
                  Recurring Schedule
                </Label>
                <Switch
                  checked={cronSchedule !== null}
                  id="schedule-toggle"
                  onCheckedChange={(checked) =>
                    setCronSchedule(checked ? "0 9 * * *" : null)
                  }
                />
              </div>
              {cronSchedule !== null && (
                <ScheduleBuilder
                  className="rounded-md border border-border/50 p-3"
                  onChange={setCronSchedule}
                  value={cronSchedule}
                />
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export { laneToggleVariants };
