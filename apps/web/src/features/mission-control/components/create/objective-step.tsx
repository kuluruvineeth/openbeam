"use client";

import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  ToggleGroup,
  ToggleGroupItem,
} from "@openplane/ui";
import { cva } from "class-variance-authority";
import { useMissionCreationStore } from "../../stores/mission-creation-store";

const OBJECTIVE_CHAR_LIMIT = 5000;

const laneToggleVariants = cva(
  "flex flex-1 flex-col items-start gap-0.5 rounded-sm px-3 py-2 text-left text-xs transition-colors",
  {
    variants: {
      active: {
        true: "bg-accent text-accent-foreground",
        false: "text-muted-foreground",
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
  const objective = useMissionCreationStore((s) => s.objective);
  const lane = useMissionCreationStore((s) => s.lane);
  const budgetCents = useMissionCreationStore((s) => s.budgetCents);
  const setObjective = useMissionCreationStore((s) => s.setObjective);
  const setLane = useMissionCreationStore((s) => s.setLane);
  const setBudgetCents = useMissionCreationStore((s) => s.setBudgetCents);

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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs" htmlFor="objective">
          Objective
        </Label>
        <Textarea
          className="min-h-[120px] resize-none text-sm"
          id="objective"
          maxLength={OBJECTIVE_CHAR_LIMIT}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="Describe what this mission should accomplish..."
          value={objective}
        />
        <span className="self-end text-[10px] text-muted-foreground tabular-nums">
          {objective.length}/{OBJECTIVE_CHAR_LIMIT}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Execution Lane</Label>
        <ToggleGroup
          className="justify-start gap-1"
          onValueChange={handleLaneChange}
          type="single"
          value={lane}
        >
          {LANE_OPTIONS.map((option) => (
            <ToggleGroupItem
              className={laneToggleVariants({ active: lane === option.value })}
              key={option.value}
              value={option.value}
            >
              <span className="font-medium">{option.label}</span>
              <span className="text-[10px] text-muted-foreground">
                {option.description}
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
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
          <Select defaultValue="3">
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
    </div>
  );
}

export { laneToggleVariants };
