"use client";

import type { CodeRuntime } from "@openplane/types/canvas";
import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Icons } from "../../icons";
import { ToggleGroup, ToggleGroupItem } from "../../toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../tooltip";

export interface RuntimeSelectorProps {
  value: CodeRuntime;
  onChange: (value: CodeRuntime) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

const RUNTIMES: Array<{
  value: CodeRuntime;
  label: string;
  icon: keyof typeof Icons;
  description: string;
}> = [
  {
    value: "javascript",
    label: "JS",
    icon: "Zap",
    description: "Fast execution, browser-native",
  },
  {
    value: "typescript",
    label: "TS",
    icon: "Type",
    description: "Type-safe JavaScript",
  },
  {
    value: "python",
    label: "PY",
    icon: "BrainCircuit",
    description: "Data processing, ML libraries",
  },
];

export const RuntimeSelector = memo(function RuntimeSelectorComponent({
  value,
  onChange,
  disabled,
  className,
  compact = false,
}: RuntimeSelectorProps) {
  const handleValueChange = useCallback(
    (newValue: string) => {
      if (newValue) {
        onChange(newValue as CodeRuntime);
      }
    },
    [onChange]
  );

  if (compact) {
    return (
      <ToggleGroup
        className={cn("gap-0.5", className)}
        disabled={disabled}
        onValueChange={handleValueChange}
        type="single"
        value={value}
      >
        {RUNTIMES.map((runtime) => {
          const Icon = Icons[runtime.icon];
          return (
            <Tooltip key={runtime.value}>
              <TooltipTrigger asChild>
                <ToggleGroupItem
                  className={cn(
                    "h-7 px-2 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  )}
                  value={runtime.value}
                >
                  <Icon className="size-3.5" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-medium">{runtime.label}</p>
                <p className="text-muted-foreground text-xs">
                  {runtime.description}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </ToggleGroup>
    );
  }

  return (
    <ToggleGroup
      className={cn("gap-1", className)}
      disabled={disabled}
      onValueChange={handleValueChange}
      type="single"
      value={value}
    >
      {RUNTIMES.map((runtime) => {
        const Icon = Icons[runtime.icon];
        return (
          <Tooltip key={runtime.value}>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                className={cn(
                  "h-8 gap-1.5 px-2.5",
                  "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                )}
                value={runtime.value}
              >
                <Icon className="size-3.5" />
                <span className="text-xs">{runtime.label}</span>
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom">{runtime.description}</TooltipContent>
          </Tooltip>
        );
      })}
    </ToggleGroup>
  );
});

RuntimeSelector.displayName = "RuntimeSelector";
