"use client";

import type { EntityType } from "@openplane/types/canvas";
import { memo, useCallback, useMemo } from "react";
import { cn } from "../../../utils";
import { Button } from "../../button";
import { Checkbox } from "../../checkbox";
import { Icons } from "../../icons";

const ENTITY_TYPE_DEFINITIONS: {
  id: EntityType;
  name: string;
  description: string;
  icon: typeof Icons.User;
  examples: string[];
}[] = [
  {
    id: "person",
    name: "Person",
    description: "Names of people",
    icon: Icons.User,
    examples: ["John Smith", "Dr. Jane Doe"],
  },
  {
    id: "organization",
    name: "Organization",
    description: "Companies, institutions",
    icon: Icons.Building,
    examples: ["Acme Corp", "MIT"],
  },
  {
    id: "location",
    name: "Location",
    description: "Places, addresses",
    icon: Icons.MapPin,
    examples: ["New York", "123 Main St"],
  },
  {
    id: "date",
    name: "Date",
    description: "Dates and days",
    icon: Icons.Calendar,
    examples: ["January 15, 2024", "next Monday"],
  },
  {
    id: "money",
    name: "Money",
    description: "Monetary values",
    icon: Icons.DollarSign,
    examples: ["$1,500", "EUR 2.5M"],
  },
  {
    id: "percent",
    name: "Percent",
    description: "Percentages",
    icon: Icons.Percent,
    examples: ["15%", "0.5 percent"],
  },
  {
    id: "time",
    name: "Time",
    description: "Times of day",
    icon: Icons.Clock,
    examples: ["3:30 PM", "noon"],
  },
  {
    id: "email",
    name: "Email",
    description: "Email addresses",
    icon: Icons.Mail,
    examples: ["john@example.com"],
  },
  {
    id: "phone",
    name: "Phone",
    description: "Phone numbers",
    icon: Icons.Phone,
    examples: ["+1 (555) 123-4567"],
  },
  {
    id: "url",
    name: "URL",
    description: "Web addresses",
    icon: Icons.Link,
    examples: ["https://example.com"],
  },
];

export interface EntityTypeSelectorProps {
  value: EntityType[];
  onChange: (types: EntityType[]) => void;
  disabled?: boolean;
  className?: string;
}

export const EntityTypeSelector = memo(function EntityTypeSelectorComponent({
  value,
  onChange,
  disabled,
  className,
}: EntityTypeSelectorProps) {
  const handleToggle = useCallback(
    (typeId: EntityType) => {
      const isSelected = value.includes(typeId);
      if (isSelected) {
        onChange(value.filter((t) => t !== typeId));
      } else {
        onChange([...value, typeId]);
      }
    },
    [value, onChange]
  );

  const handleSelectAll = useCallback(() => {
    onChange(ENTITY_TYPE_DEFINITIONS.map((t) => t.id));
  }, [onChange]);

  const handleSelectNone = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const allSelected = value.length === ENTITY_TYPE_DEFINITIONS.length;
  const noneSelected = value.length === 0;

  const selectedCount = useMemo(() => value.length, [value]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">
          {selectedCount} of {ENTITY_TYPE_DEFINITIONS.length} selected
        </span>
        <div className="flex gap-1">
          <Button
            className="h-6 px-2 text-xs"
            disabled={disabled || allSelected}
            onClick={handleSelectAll}
            size="sm"
            variant="ghost"
          >
            All
          </Button>
          <Button
            className="h-6 px-2 text-xs"
            disabled={disabled || noneSelected}
            onClick={handleSelectNone}
            size="sm"
            variant="ghost"
          >
            None
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid grid-cols-2 gap-1.5",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        {ENTITY_TYPE_DEFINITIONS.map((entityType) => {
          const Icon = entityType.icon;
          const isSelected = value.includes(entityType.id);

          return (
            <button
              className={cn(
                "flex items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border/50 hover:border-border hover:bg-muted/50"
              )}
              disabled={disabled}
              key={entityType.id}
              onClick={() => handleToggle(entityType.id)}
              type="button"
            >
              <Checkbox
                checked={isSelected}
                className="pointer-events-none"
                disabled={disabled}
              />
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate font-medium text-sm",
                    isSelected ? "text-foreground" : "text-foreground/80"
                  )}
                >
                  {entityType.name}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

EntityTypeSelector.displayName = "EntityTypeSelector";

export { ENTITY_TYPE_DEFINITIONS };
