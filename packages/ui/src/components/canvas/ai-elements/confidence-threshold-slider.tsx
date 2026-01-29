"use client";

import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Button } from "../../button";
import { Slider } from "../../slider";

const PRESETS = [
  { value: 0.7, label: "70%" },
  { value: 0.8, label: "80%" },
  { value: 0.9, label: "90%" },
];

export interface ConfidenceThresholdSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export const ConfidenceThresholdSlider = memo(
  function ConfidenceThresholdSliderComponent({
    value,
    onChange,
    disabled,
    className,
  }: ConfidenceThresholdSliderProps) {
    const handleSliderChange = useCallback(
      (values: number[]) => {
        if (values[0] !== undefined) {
          onChange(values[0]);
        }
      },
      [onChange]
    );

    const handlePresetClick = useCallback(
      (presetValue: number) => {
        onChange(presetValue);
      },
      [onChange]
    );

    const percentage = Math.round(value * 100);
    const isLow = value < 0.7;
    const isHigh = value >= 0.9;

    const getThresholdDescription = () => {
      if (isLow) {
        return "Lower threshold allows more matches but may include uncertain classifications";
      }
      if (isHigh) {
        return "Higher threshold requires strong confidence, may result in more fallbacks";
      }
      return "Balanced threshold for most classification tasks";
    };

    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center justify-between gap-2">
          <Slider
            className="flex-1"
            disabled={disabled}
            max={1}
            min={0}
            onValueChange={handleSliderChange}
            step={0.05}
            value={[value]}
          />
          <span
            className={cn(
              "w-12 text-right font-mono text-sm tabular-nums",
              isLow && "text-amber-500",
              isHigh && "text-emerald-500"
            )}
          >
            {percentage}%
          </span>
        </div>

        <div className="flex gap-1">
          {PRESETS.map((preset) => (
            <Button
              className={cn(
                "h-6 flex-1 text-xs",
                value === preset.value && "bg-primary/10 text-primary"
              )}
              disabled={disabled}
              key={preset.value}
              onClick={() => handlePresetClick(preset.value)}
              size="sm"
              variant="outline"
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <p className="text-muted-foreground/70 text-xs">
          {getThresholdDescription()}
        </p>
      </div>
    );
  }
);

ConfidenceThresholdSlider.displayName = "ConfidenceThresholdSlider";
