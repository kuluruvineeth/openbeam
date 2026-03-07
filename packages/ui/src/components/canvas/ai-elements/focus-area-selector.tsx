"use client";

import type { SummaryFocusArea } from "@openbeam/types/canvas";
import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Checkbox } from "../../checkbox";
import { Icons } from "../../icons";
import { Label } from "../../label";

const FOCUS_AREAS = [
  {
    id: "decisions" as const,
    name: "Decisions",
    description: "Choices made and rationale",
    icon: Icons.Check,
  },
  {
    id: "action_items" as const,
    name: "Action Items",
    description: "Tasks with owners/deadlines",
    icon: Icons.CheckSquare,
  },
  {
    id: "key_metrics" as const,
    name: "Key Metrics",
    description: "Numbers and measurements",
    icon: Icons.BarChart,
  },
  {
    id: "people" as const,
    name: "People",
    description: "Names and mentions",
    icon: Icons.Users,
  },
  {
    id: "dates" as const,
    name: "Dates",
    description: "Timelines and deadlines",
    icon: Icons.Calendar,
  },
  {
    id: "risks" as const,
    name: "Risks",
    description: "Concerns and blockers",
    icon: Icons.AlertTriangle,
  },
  {
    id: "opportunities" as const,
    name: "Opportunities",
    description: "Positive findings",
    icon: Icons.TrendingUp,
  },
  {
    id: "questions" as const,
    name: "Questions",
    description: "Open items to address",
    icon: Icons.HelpCircle,
  },
];

export interface FocusAreaSelectorProps {
  value: SummaryFocusArea[];
  onChange: (value: SummaryFocusArea[]) => void;
  disabled?: boolean;
  className?: string;
}

export const FocusAreaSelector = memo(function FocusAreaSelectorComponent({
  value,
  onChange,
  disabled,
  className,
}: FocusAreaSelectorProps) {
  const handleToggle = useCallback(
    (areaId: SummaryFocusArea, checked: boolean) => {
      if (checked) {
        onChange([...value, areaId]);
      } else {
        onChange(value.filter((a) => a !== areaId));
      }
    },
    [value, onChange]
  );

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      {FOCUS_AREAS.map((area) => {
        const Icon = area.icon;
        const isSelected = value.includes(area.id);

        return (
          <Label
            className={cn(
              "flex cursor-pointer items-start gap-2 rounded-md border px-2.5 py-2 transition-colors",
              isSelected
                ? "border-primary/50 bg-primary/5"
                : "border-border/50 hover:border-border hover:bg-muted/50"
            )}
            key={area.id}
          >
            <Checkbox
              checked={isSelected}
              className="mt-0.5"
              onCheckedChange={(checked) =>
                handleToggle(area.id, checked === true)
              }
            />
            <Icon
              className={cn(
                "mt-0.5 size-3.5 shrink-0",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-xs">{area.name}</div>
              <div className="truncate text-[10px] text-muted-foreground">
                {area.description}
              </div>
            </div>
          </Label>
        );
      })}
    </div>
  );
});

FocusAreaSelector.displayName = "FocusAreaSelector";
