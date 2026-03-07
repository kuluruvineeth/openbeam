"use client";

import type { SummaryOutputFormat } from "@openbeam/types/canvas";
import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Icons } from "../../icons";

const OUTPUT_FORMATS = [
  {
    id: "paragraph" as const,
    name: "Paragraph",
    description: "Flowing prose",
    icon: Icons.AlignLeft,
  },
  {
    id: "bullets" as const,
    name: "Bullets",
    description: "Key point list",
    icon: Icons.List,
  },
  {
    id: "executive" as const,
    name: "Executive",
    description: "Decision-maker focused",
    icon: Icons.Briefcase,
  },
  {
    id: "key_points" as const,
    name: "Key Points",
    description: "TL;DR extraction",
    icon: Icons.Sparkles,
  },
  {
    id: "action_items" as const,
    name: "Actions",
    description: "Extractable tasks",
    icon: Icons.CheckSquare,
  },
  {
    id: "timeline" as const,
    name: "Timeline",
    description: "Chronological events",
    icon: Icons.Calendar,
  },
  {
    id: "qa_pairs" as const,
    name: "Q&A",
    description: "Question-answer format",
    icon: Icons.MessageCircle,
  },
];

export interface OutputFormatSelectorProps {
  value: SummaryOutputFormat;
  onChange: (value: SummaryOutputFormat) => void;
  disabled?: boolean;
  className?: string;
}

export const OutputFormatSelector = memo(
  function OutputFormatSelectorComponent({
    value,
    onChange,
    disabled,
    className,
  }: OutputFormatSelectorProps) {
    const handleSelect = useCallback(
      (format: SummaryOutputFormat) => {
        if (!disabled) {
          onChange(format);
        }
      },
      [onChange, disabled]
    );

    return (
      <div
        className={cn(
          "grid grid-cols-3 gap-2",
          disabled && "pointer-events-none opacity-50",
          className
        )}
      >
        {OUTPUT_FORMATS.map((format) => {
          const Icon = format.icon;
          const isSelected = value === format.id;

          return (
            <button
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-md border px-2 py-2.5 text-center transition-colors",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border/50 hover:border-border hover:bg-muted/50"
              )}
              key={format.id}
              onClick={() => handleSelect(format.id)}
              type="button"
            >
              <Icon
                className={cn(
                  "size-4",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}
              />
              <div className="space-y-0.5">
                <div
                  className={cn(
                    "font-medium text-xs",
                    isSelected ? "text-foreground" : "text-foreground/80"
                  )}
                >
                  {format.name}
                </div>
                <div className="text-[10px] text-muted-foreground leading-tight">
                  {format.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }
);

OutputFormatSelector.displayName = "OutputFormatSelector";
