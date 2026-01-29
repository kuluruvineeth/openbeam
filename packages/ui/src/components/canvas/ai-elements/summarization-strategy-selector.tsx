"use client";

import type { SummarizationStrategy } from "@openplane/types/canvas";
import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Icons } from "../../icons";
import { Label } from "../../label";
import { RadioGroup, RadioGroupItem } from "../../radio-group";

const STRATEGIES = [
  {
    id: "auto" as const,
    name: "Auto",
    description: "Automatically selects best strategy based on input size",
    icon: Icons.Sparkles,
  },
  {
    id: "stuff" as const,
    name: "Stuff",
    description: "Single prompt, fast for small documents (<4K tokens)",
    icon: Icons.Zap,
  },
  {
    id: "map_reduce" as const,
    name: "Map-Reduce",
    description: "Parallel chunk processing, best for large documents",
    icon: Icons.GitBranch,
  },
  {
    id: "refine" as const,
    name: "Refine",
    description: "Sequential refinement, highest quality output",
    icon: Icons.RefreshCw,
  },
];

export interface SummarizationStrategySelectorProps {
  value: SummarizationStrategy;
  onChange: (value: SummarizationStrategy) => void;
  disabled?: boolean;
  className?: string;
}

export const SummarizationStrategySelector = memo(
  function SummarizationStrategySelectorComponent({
    value,
    onChange,
    disabled,
    className,
  }: SummarizationStrategySelectorProps) {
    const handleChange = useCallback(
      (newValue: string) => {
        onChange(newValue as SummarizationStrategy);
      },
      [onChange]
    );

    return (
      <RadioGroup
        className={cn("space-y-2", className)}
        disabled={disabled}
        onValueChange={handleChange}
        value={value}
      >
        {STRATEGIES.map((strategy) => {
          const Icon = strategy.icon;
          const isSelected = value === strategy.id;

          return (
            <Label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border/50 hover:border-border hover:bg-muted/50",
                disabled && "cursor-not-allowed opacity-50"
              )}
              htmlFor={`strategy-${strategy.id}`}
              key={strategy.id}
            >
              <RadioGroupItem
                className="mt-0.5"
                id={`strategy-${strategy.id}`}
                value={strategy.id}
              />
              <Icon
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}
              />
              <div className="flex-1 space-y-0.5">
                <div className="font-medium text-sm">{strategy.name}</div>
                <div className="text-muted-foreground text-xs">
                  {strategy.description}
                </div>
              </div>
            </Label>
          );
        })}
      </RadioGroup>
    );
  }
);

SummarizationStrategySelector.displayName = "SummarizationStrategySelector";
