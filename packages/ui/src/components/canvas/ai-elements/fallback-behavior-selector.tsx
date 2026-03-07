"use client";

import type { FallbackBehavior } from "@openbeam/types/canvas";
import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Icons } from "../../icons";
import { RadioGroup, RadioGroupItem } from "../../radio-group";

const FALLBACK_OPTIONS = [
  {
    id: "other_branch" as const,
    name: "Other Branch",
    description: 'Route to "Other" output',
    icon: Icons.GitBranch,
  },
  {
    id: "lowest_match" as const,
    name: "Lowest Match",
    description: "Use lowest-confidence match",
    icon: Icons.ChevronDown,
  },
  {
    id: "discard" as const,
    name: "Discard",
    description: "Skip unmatched items",
    icon: Icons.Trash,
  },
  {
    id: "error" as const,
    name: "Error",
    description: "Throw an error",
    icon: Icons.AlertCircle,
  },
];

export interface FallbackBehaviorSelectorProps {
  value: FallbackBehavior;
  onChange: (value: FallbackBehavior) => void;
  disabled?: boolean;
  className?: string;
}

export const FallbackBehaviorSelector = memo(
  function FallbackBehaviorSelectorComponent({
    value,
    onChange,
    disabled,
    className,
  }: FallbackBehaviorSelectorProps) {
    const handleChange = useCallback(
      (newValue: string) => {
        onChange(newValue as FallbackBehavior);
      },
      [onChange]
    );

    return (
      <RadioGroup
        className={cn("space-y-1.5", className)}
        disabled={disabled}
        onValueChange={handleChange}
        value={value}
      >
        {FALLBACK_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.id;

          const inputId = `fallback-${option.id}`;
          return (
            <label
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2",
                "transition-colors hover:bg-muted/50",
                isSelected ? "border-primary bg-primary/5" : "border-border/50",
                disabled && "pointer-events-none opacity-50"
              )}
              htmlFor={inputId}
              key={option.id}
            >
              <RadioGroupItem id={inputId} value={option.id} />
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{option.name}</p>
                <p className="truncate text-muted-foreground text-xs">
                  {option.description}
                </p>
              </div>
            </label>
          );
        })}
      </RadioGroup>
    );
  }
);

FallbackBehaviorSelector.displayName = "FallbackBehaviorSelector";
