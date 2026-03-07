"use client";

import type { ParameterBindingMode } from "@openbeam/types/canvas";
import { forwardRef, memo } from "react";
import { Icons } from "../../icons";
import { ToggleGroup, ToggleGroupItem } from "../../toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../tooltip";

interface BindingModeToggleProps {
  value: ParameterBindingMode;
  onChange: (mode: ParameterBindingMode) => void;
  disabled?: boolean;
}

const MODES = [
  { value: "static" as const, icon: Icons.Type, label: "Fixed value" },
  { value: "variable" as const, icon: Icons.Link, label: "From upstream node" },
  {
    value: "ai_inferred" as const,
    icon: Icons.BotIcon,
    label: "Agent fills at runtime",
  },
] as const;

export const BindingModeToggle = memo(
  forwardRef<HTMLDivElement, BindingModeToggleProps>(
    function BindingModeToggleComponent({ value, onChange, disabled }, ref) {
      return (
        <TooltipProvider delayDuration={300}>
          <ToggleGroup
            disabled={disabled}
            onValueChange={(v) => {
              if (v) {
                onChange(v as ParameterBindingMode);
              }
            }}
            ref={ref}
            size="sm"
            type="single"
            value={value}
          >
            {MODES.map((mode) => (
              <Tooltip key={mode.value}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem className="h-6 w-6 p-0" value={mode.value}>
                    <mode.icon className="size-3" />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{mode.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </ToggleGroup>
        </TooltipProvider>
      );
    }
  )
);

BindingModeToggle.displayName = "BindingModeToggle";
