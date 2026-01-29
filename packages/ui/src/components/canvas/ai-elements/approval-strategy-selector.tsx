"use client";

import type { ApprovalNodeConfig } from "@openplane/types/canvas";
import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Icons } from "../../icons";

type ApprovalType = ApprovalNodeConfig["approvalType"];

const STRATEGY_OPTIONS: {
  value: ApprovalType;
  label: string;
  description: string;
  icon: keyof typeof Icons;
}[] = [
  {
    value: "single",
    label: "Single",
    description: "One person decides",
    icon: "UserCheck",
  },
  {
    value: "sequential",
    label: "Sequential",
    description: "Chain of approvers in order",
    icon: "ArrowRight",
  },
  {
    value: "parallel",
    label: "Parallel",
    description: "Multiple approvers at once",
    icon: "Users",
  },
];

export interface ApprovalStrategySelectorProps {
  value: ApprovalType;
  onChange: (type: ApprovalType) => void;
  disabled?: boolean;
  className?: string;
}

export const ApprovalStrategySelector = memo(
  function ApprovalStrategySelectorComponent({
    value,
    onChange,
    disabled,
    className,
  }: ApprovalStrategySelectorProps) {
    const handleSelect = useCallback(
      (type: ApprovalType) => {
        if (!disabled) {
          onChange(type);
        }
      },
      [onChange, disabled]
    );

    return (
      <div className={cn("grid grid-cols-3 gap-2", className)}>
        {STRATEGY_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          const Icon = Icons[option.icon];
          return (
            <button
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-md border p-3 text-center transition-colors",
                "hover:border-border hover:bg-muted/50",
                isSelected && "border-primary bg-primary/5",
                disabled && "pointer-events-none opacity-50"
              )}
              disabled={disabled}
              key={option.value}
              onClick={() => handleSelect(option.value)}
              type="button"
            >
              <Icon
                className={cn(
                  "size-4",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span className="font-medium text-xs">{option.label}</span>
              <span className="line-clamp-2 text-[10px] text-muted-foreground leading-tight">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    );
  }
);

ApprovalStrategySelector.displayName = "ApprovalStrategySelector";
