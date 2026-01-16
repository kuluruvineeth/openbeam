"use client";

import { Label } from "@openplane/ui";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type RrfSliderProps = {
  id: string;
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
};

export function RrfSlider({
  id,
  label,
  value,
  onValueChange,
  min = 0,
  max = 1,
  step = 0.05,
  className,
  disabled,
}: RrfSliderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground text-xs" htmlFor={id}>
          {label}
        </Label>
        <output
          className="font-mono text-foreground/60 text-xs tabular-nums"
          htmlFor={id}
        >
          {(value * 100).toFixed(0)}%
        </output>
      </div>
      <Slider
        aria-label={label}
        aria-valuetext={`${(value * 100).toFixed(0)} percent`}
        disabled={disabled}
        id={id}
        max={max}
        min={min}
        onValueChange={([v]) => onValueChange(v ?? 0)}
        step={step}
        value={[value]}
      />
    </div>
  );
}
