"use client";

import { memo, useCallback } from "react";
import { cn } from "../../utils/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip";

export interface ColorOption {
  id: string;
  value: string;
  label: string;
}

export const DEFAULT_COLOR_OPTIONS: ColorOption[] = [
  { id: "blue", value: "#3b82f6", label: "Blue" },
  { id: "green", value: "#22c55e", label: "Green" },
  { id: "amber", value: "#f59e0b", label: "Amber" },
  { id: "red", value: "#ef4444", label: "Red" },
  { id: "purple", value: "#a855f7", label: "Purple" },
  { id: "pink", value: "#ec4899", label: "Pink" },
  { id: "cyan", value: "#06b6d4", label: "Cyan" },
  { id: "orange", value: "#f97316", label: "Orange" },
];

export interface ColorSwatchesProps {
  value: string;
  onChange: (color: string) => void;
  colors?: ColorOption[];
  disabled?: boolean;
  size?: "sm" | "md";
  showTooltips?: boolean;
  className?: string;
}

export const ColorSwatches = memo(function ColorSwatchesComponent({
  value,
  onChange,
  colors = DEFAULT_COLOR_OPTIONS,
  disabled,
  size = "md",
  showTooltips = true,
  className,
}: ColorSwatchesProps) {
  const handleColorClick = useCallback(
    (colorValue: string) => {
      if (!disabled) {
        onChange(colorValue);
      }
    },
    [disabled, onChange]
  );

  const sizeClasses = size === "sm" ? "size-4" : "size-5";

  const renderSwatch = (color: ColorOption) => {
    const isSelected = value === color.value;
    const swatch = (
      <button
        className={cn(
          sizeClasses,
          "rounded-full transition-all",
          isSelected
            ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
            : "hover:scale-110",
          disabled && "cursor-not-allowed opacity-50"
        )}
        disabled={disabled}
        onClick={() => handleColorClick(color.value)}
        style={{ backgroundColor: color.value }}
        type="button"
      />
    );

    if (showTooltips) {
      return (
        <Tooltip key={color.id}>
          <TooltipTrigger asChild>{swatch}</TooltipTrigger>
          <TooltipContent side="top">{color.label}</TooltipContent>
        </Tooltip>
      );
    }

    return <span key={color.id}>{swatch}</span>;
  };

  return (
    <div className={cn("flex gap-1", className)}>
      {colors.map(renderSwatch)}
    </div>
  );
});

ColorSwatches.displayName = "ColorSwatches";
