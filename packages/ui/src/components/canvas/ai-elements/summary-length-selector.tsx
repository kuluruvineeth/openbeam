"use client";

import type { SummaryLength } from "@openbeam/types/canvas";
import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Input } from "../../input";
import { Label } from "../../label";
import { RadioGroup, RadioGroupItem } from "../../radio-group";

const LENGTH_OPTIONS = [
  {
    id: "brief" as const,
    name: "Brief",
    description: "1-2 sentences or 3-5 bullets",
  },
  {
    id: "standard" as const,
    name: "Standard",
    description: "1-2 paragraphs or 5-10 bullets",
  },
  {
    id: "detailed" as const,
    name: "Detailed",
    description: "3-5 paragraphs or 10-20 bullets",
  },
  {
    id: "custom" as const,
    name: "Custom",
    description: "Specify word limit",
  },
];

export interface SummaryLengthSelectorProps {
  value: SummaryLength;
  customWords?: number;
  onChange: (value: SummaryLength) => void;
  onCustomWordsChange?: (words: number | undefined) => void;
  disabled?: boolean;
  className?: string;
}

export const SummaryLengthSelector = memo(
  function SummaryLengthSelectorComponent({
    value,
    customWords,
    onChange,
    onCustomWordsChange,
    disabled,
    className,
  }: SummaryLengthSelectorProps) {
    const handleChange = useCallback(
      (newValue: string) => {
        onChange(newValue as SummaryLength);
      },
      [onChange]
    );

    const handleCustomWordsChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const num = Number.parseInt(e.target.value, 10);
        onCustomWordsChange?.(Number.isNaN(num) ? undefined : num);
      },
      [onCustomWordsChange]
    );

    return (
      <div className={cn("space-y-3", className)}>
        <RadioGroup
          className="space-y-1.5"
          disabled={disabled}
          onValueChange={handleChange}
          value={value}
        >
          {LENGTH_OPTIONS.map((option) => {
            const isSelected = value === option.id;

            return (
              <Label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:border-border hover:bg-muted/50",
                  disabled && "cursor-not-allowed opacity-50"
                )}
                htmlFor={`length-${option.id}`}
                key={option.id}
              >
                <RadioGroupItem id={`length-${option.id}`} value={option.id} />
                <div className="flex-1">
                  <span className="font-medium text-sm">{option.name}</span>
                  <span className="ml-2 text-muted-foreground text-xs">
                    {option.description}
                  </span>
                </div>
              </Label>
            );
          })}
        </RadioGroup>

        {value === "custom" && (
          <div className="flex items-center gap-2 pl-7">
            <Input
              className="h-8 w-24 font-mono text-sm"
              disabled={disabled}
              max={5000}
              min={50}
              onChange={handleCustomWordsChange}
              placeholder="200"
              type="number"
              value={customWords ?? ""}
            />
            <span className="text-muted-foreground text-sm">words</span>
          </div>
        )}
      </div>
    );
  }
);

SummaryLengthSelector.displayName = "SummaryLengthSelector";
