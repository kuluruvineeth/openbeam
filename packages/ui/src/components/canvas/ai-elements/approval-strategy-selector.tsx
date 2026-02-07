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
  available: boolean;
}[] = [
  {
    value: "single",
    label: "Single",
    description: "One person decides",
    icon: "UserCheck",
    available: true,
  },
  {
    value: "sequential",
    label: "Sequential",
    description: "Chain of approvers in order",
    icon: "ArrowRight",
    available: false,
  },
  {
    value: "parallel",
    label: "Parallel",
    description: "Multiple approvers at once",
    icon: "Users",
    available: false,
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
          const isDisabled = disabled || !option.available;
          return (
            <button
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-md border p-3 text-center transition-colors",
                "hover:border-border hover:bg-muted/50",
                isSelected && "border-primary bg-primary/5",
                isDisabled && "pointer-events-none opacity-50"
              )}
              disabled={isDisabled}
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
              {!option.available && (
                <span className="text-[10px] text-muted-foreground">
                  Not supported
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }
);

ApprovalStrategySelector.displayName = "ApprovalStrategySelector";
