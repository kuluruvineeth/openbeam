"use client";

import type { ExtractionMode } from "@openbeam/types/canvas";
import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Icons } from "../../icons";
import { SelectionCard } from "../../selection-card";

const EXTRACTION_MODES = [
  {
    id: "schema" as const,
    name: "Schema",
    description: "Define fields manually",
    icon: Icons.ListTree,
  },
  {
    id: "template" as const,
    name: "Template",
    description: "Use pre-built templates",
    icon: Icons.FileText,
  },
  {
    id: "example" as const,
    name: "Example",
    description: "Generate from JSON",
    icon: Icons.Code,
  },
  {
    id: "natural" as const,
    name: "Natural",
    description: "Describe extraction",
    icon: Icons.MessageSquare,
  },
];

export interface ExtractionModeSelectorProps {
  value: ExtractionMode;
  onChange: (value: ExtractionMode) => void;
  disabled?: boolean;
  className?: string;
}

export const ExtractionModeSelector = memo(
  function ExtractionModeSelectorComponent({
    value,
    onChange,
    disabled,
    className,
  }: ExtractionModeSelectorProps) {
    const handleSelect = useCallback(
      (modeId: ExtractionMode) => {
        onChange(modeId);
      },
      [onChange]
    );

    return (
      <div
        className={cn(
          "grid grid-cols-2 gap-2",
          disabled && "pointer-events-none opacity-50",
          className
        )}
      >
        {EXTRACTION_MODES.map((mode) => {
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

ExtractionModeSelector.displayName = "ExtractionModeSelector";
