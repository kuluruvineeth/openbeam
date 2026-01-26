"use client";

import type { ClassificationMode } from "@openplane/types/canvas";
import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Icons } from "../../icons";
import { SelectionCard } from "../../selection-card";

const CLASSIFICATION_MODES = [
  {
    id: "categories" as const,
    name: "Categories",
    description: "Assign to predefined categories",
    icon: Icons.Tags,
  },
  {
    id: "routing" as const,
    name: "Routing",
    description: "Route to workflow branches",
    icon: Icons.GitBranch,
  },
  {
    id: "zero_shot" as const,
    name: "Zero-Shot",
    description: "Classify without examples",
    icon: Icons.Zap,
  },
];

export interface ClassificationModeSelectorProps {
  value: ClassificationMode;
  onChange: (value: ClassificationMode) => void;
  disabled?: boolean;
  className?: string;
}

export const ClassificationModeSelector = memo(
  function ClassificationModeSelectorComponent({
    value,
    onChange,
    disabled,
    className,
  }: ClassificationModeSelectorProps) {
    const handleSelect = useCallback(
      (modeId: ClassificationMode) => {
        onChange(modeId);
      },
      [onChange]
    );

    return (
      <div
        className={cn(
          "grid grid-cols-3 gap-2",
          disabled && "pointer-events-none opacity-50",
          className
        )}
      >
        {CLASSIFICATION_MODES.map((mode) => {
          const Icon = mode.icon;
          const isSelected = value === mode.id;

          return (
            <SelectionCard
              description={mode.description}
              disabled={disabled}
              icon={
                <Icon
                  className={cn(
                    "size-4",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}
                />
              }
              key={mode.id}
              label={mode.name}
              layout="vertical"
              onClick={() => handleSelect(mode.id)}
              selected={isSelected}
              size="sm"
            />
          );
        })}
      </div>
    );
  }
);

ClassificationModeSelector.displayName = "ClassificationModeSelector";
