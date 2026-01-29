"use client";

import type { ApprovalSeverity } from "@openplane/types/canvas";
import { memo, useCallback } from "react";
import { cn } from "../../../utils";

const SEVERITY_OPTIONS: {
  value: ApprovalSeverity;
  label: string;
  color: string;
  activeColor: string;
}[] = [
  {
    value: "low",
    label: "Low",
    color: "bg-emerald-500/10 text-emerald-600",
    activeColor: "border-emerald-500 bg-emerald-500/10 text-emerald-600",
  },
  {
    value: "medium",
    label: "Medium",
    color: "bg-amber-500/10 text-amber-600",
    activeColor: "border-amber-500 bg-amber-500/10 text-amber-600",
  },
  {
    value: "high",
    label: "High",
    color: "bg-orange-500/10 text-orange-600",
    activeColor: "border-orange-500 bg-orange-500/10 text-orange-600",
  },
  {
    value: "critical",
    label: "Critical",
    color: "bg-red-500/10 text-red-600",
    activeColor: "border-red-500 bg-red-500/10 text-red-600",
  },
];

export interface SeveritySelectorProps {
  value: ApprovalSeverity;
  onChange: (severity: ApprovalSeverity) => void;
  disabled?: boolean;
  className?: string;
}

export const SeveritySelector = memo(function SeveritySelectorComponent({
  value,
  onChange,
  disabled,
  className,
}: SeveritySelectorProps) {
  const handleSelect = useCallback(
    (severity: ApprovalSeverity) => {
      if (!disabled) {
        onChange(severity);
      }
    },
    [onChange, disabled]
  );

  return (
    <div className={cn("flex gap-1.5", className)}>
      {SEVERITY_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            className={cn(
              "flex-1 rounded-md border px-2 py-1.5 text-center font-medium text-xs transition-colors",
              isSelected
                ? option.activeColor
                : "border-border/50 text-muted-foreground hover:border-border hover:bg-muted/50",
              disabled && "pointer-events-none opacity-50"
            )}
            disabled={disabled}
            key={option.value}
            onClick={() => handleSelect(option.value)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
});

SeveritySelector.displayName = "SeveritySelector";
