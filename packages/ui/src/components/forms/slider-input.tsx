"use client";

import { cn } from "../../utils/cn";
import { Slider } from "../slider";

interface SliderInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  description?: string;
  formatValue?: (value: number) => string;
  showValue?: boolean;
  marks?: { value: number; label: string }[];
  className?: string;
}

function SliderInput({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  description,
  formatValue = (v) => String(v),
  showValue = true,
  marks,
  className,
}: SliderInputProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          <div>
            {label && <p className="font-medium text-sm">{label}</p>}
            {description && (
              <p className="text-muted-foreground text-xs">{description}</p>
            )}
          </div>
          {showValue && (
            <span className="font-medium text-sm tabular-nums">
              {formatValue(value)}
            </span>
          )}
        </div>
      )}

      <Slider
        max={max}
        min={min}
        onValueChange={(values) => onChange(values[0] ?? value)}
        step={step}
        value={[value]}
      />

      {marks && marks.length > 0 && (
        <div className="relative h-4">
          {marks.map((mark) => {
            const position = ((mark.value - min) / (max - min)) * 100;
            return (
              <span
                className="-translate-x-1/2 absolute text-[10px] text-muted-foreground"
                key={mark.value}
                style={{ left: `${position}%` }}
              >
                {mark.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { SliderInput };
export type { SliderInputProps };
