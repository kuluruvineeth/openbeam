"use client";

import type { CodeVariableType } from "@openplane/types/canvas";
import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Icons } from "../../icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../select";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../tooltip";

export interface VariableTypeSelectorProps {
  value: CodeVariableType;
  onChange: (value: CodeVariableType) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

const VARIABLE_TYPES: Array<{
  value: CodeVariableType;
  label: string;
  icon: keyof typeof Icons;
  description: string;
  color: string;
}> = [
  {
    value: "string",
    label: "String",
    icon: "Type",
    description: "Text value",
    color: "text-green-500",
  },
  {
    value: "number",
    label: "Number",
    icon: "Hash",
    description: "Numeric value",
    color: "text-blue-500",
  },
  {
    value: "boolean",
    label: "Boolean",
    icon: "ToggleLeft",
    description: "True or false",
    color: "text-orange-500",
  },
  {
    value: "object",
    label: "Object",
    icon: "Braces",
    description: "Key-value pairs",
    color: "text-purple-500",
  },
  {
    value: "array",
    label: "Array",
    icon: "List",
    description: "List of items",
    color: "text-cyan-500",
  },
  {
    value: "any",
    label: "Any",
    icon: "Sparkles",
    description: "Any type",
    color: "text-muted-foreground",
  },
];

export const VariableTypeSelector = memo(
  function VariableTypeSelectorComponent({
    value,
    onChange,
    disabled,
    className,
    compact = false,
  }: VariableTypeSelectorProps) {
    const handleValueChange = useCallback(
      (newValue: string) => {
        onChange(newValue as CodeVariableType);
      },
      [onChange]
    );

    const selectedType = VARIABLE_TYPES.find((t) => t.value === value);
    const SelectedIcon = selectedType
      ? Icons[selectedType.icon]
      : Icons.Sparkles;

    return (
      <Select
        disabled={disabled}
        onValueChange={handleValueChange}
        value={value}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <SelectTrigger
              className={cn(
                compact ? "h-7 w-auto gap-1 px-2" : "h-8 w-[110px]",
                className
              )}
            >
              <SelectValue>
                <div className="flex items-center gap-1.5">
                  <SelectedIcon
                    className={cn("size-3.5", selectedType?.color)}
                  />
                  {!compact && (
                    <span className="text-xs">{selectedType?.label}</span>
                  )}
                </div>
              </SelectValue>
            </SelectTrigger>
          </TooltipTrigger>
          {compact && (
            <TooltipContent side="top">{selectedType?.label}</TooltipContent>
          )}
        </Tooltip>
        <SelectContent>
          {VARIABLE_TYPES.map((type) => {
            const Icon = Icons[type.icon];
            return (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <Icon className={cn("size-4", type.color)} />
                  <div className="flex flex-col">
                    <span className="text-sm">{type.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {type.description}
                    </span>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    );
  }
);

VariableTypeSelector.displayName = "VariableTypeSelector";

export { VARIABLE_TYPES };
