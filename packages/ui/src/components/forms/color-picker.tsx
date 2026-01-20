"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { cn } from "../../utils/cn";
import { Input } from "../input";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#78716c",
  "#64748b",
  "#000000",
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  presets?: string[];
  showInput?: boolean;
  className?: string;
}

function ColorPicker({
  value,
  onChange,
  presets = PRESET_COLORS,
  showInput = true,
  className,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2",
            "border border-border transition-colors hover:bg-muted",
            className
          )}
          type="button"
        >
          <div
            className="h-5 w-5 rounded-md border border-border"
            style={{ backgroundColor: value }}
          />
          <span className="text-sm">{value}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="grid grid-cols-5 gap-2">
          {presets.map((color) => (
            <button
              className={cn(
                "h-8 w-8 rounded-md border border-border",
                "flex items-center justify-center",
                "transition-transform hover:scale-110"
              )}
              key={color}
              onClick={() => {
                onChange(color);
                setIsOpen(false);
              }}
              style={{ backgroundColor: color }}
              type="button"
            >
              {value === color && (
                <Check
                  className={cn(
                    "h-4 w-4",
                    color === "#000000" || color === "#64748b"
                      ? "text-white"
                      : "text-black"
                  )}
                />
              )}
            </button>
          ))}
        </div>

        {showInput && (
          <div className="mt-3 border-border border-t pt-3">
            <Input
              className="font-mono text-sm"
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              value={value}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export { ColorPicker, PRESET_COLORS };
export type { ColorPickerProps };
