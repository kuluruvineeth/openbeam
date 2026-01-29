"use client";

import type { TemplatePreset } from "@openplane/types/canvas";
import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Badge } from "../../badge";
import { Icons } from "../../icons";
import { ScrollArea } from "../../scroll-area";
import { TEMPLATE_PRESETS } from "./template-preset-definitions";

const ICON_MAP: Record<string, typeof Icons.FileText> = {
  FileText: Icons.FileText,
  Mail: Icons.Mail,
  Bell: Icons.Bell,
  BarChart: Icons.BarChart,
  Braces: Icons.Braces,
  Sparkles: Icons.Sparkles,
  FileSpreadsheet: Icons.FileSpreadsheetIcon,
  Repeat: Icons.Repeat,
};

export interface TemplatePresetSelectorProps {
  value?: TemplatePreset;
  onChange: (preset: TemplatePreset) => void;
  disabled?: boolean;
  className?: string;
}

export const TemplatePresetSelector = memo(
  function TemplatePresetSelectorComponent({
    value,
    onChange,
    disabled,
    className,
  }: TemplatePresetSelectorProps) {
    const handleSelect = useCallback(
      (presetId: TemplatePreset) => {
        onChange(presetId);
      },
      [onChange]
    );

    return (
      <ScrollArea className={cn("h-[280px]", className)}>
        <div className="grid grid-cols-2 gap-2 p-1 pr-3">
          {TEMPLATE_PRESETS.map((preset) => {
            const Icon = ICON_MAP[preset.icon] ?? Icons.FileText;
            const isSelected = value === preset.id;

            return (
              <button
                className={cn(
                  "flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors",
                  "hover:border-border hover:bg-muted/50",
                  isSelected && "border-primary bg-primary/5",
                  disabled && "pointer-events-none opacity-50"
                )}
                disabled={disabled}
                key={preset.id}
                onClick={() => handleSelect(preset.id)}
                type="button"
              >
                <div className="flex w-full items-center justify-between">
                  <Icon
                    className={cn(
                      "size-4",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  {preset.variables.length > 0 && (
                    <Badge className="text-[10px]" variant="secondary">
                      {preset.variables.length} vars
                    </Badge>
                  )}
                </div>
                <span className="font-medium text-sm">{preset.name}</span>
                <span className="line-clamp-2 text-muted-foreground text-xs">
                  {preset.description}
                </span>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    );
  }
);

TemplatePresetSelector.displayName = "TemplatePresetSelector";
