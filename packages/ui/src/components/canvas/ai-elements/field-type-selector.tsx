"use client";

import type { FieldType } from "@openplane/types/canvas";
import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Icons } from "../../icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../select";

const FIELD_TYPES: {
  id: FieldType;
  name: string;
  icon: typeof Icons.Type;
}[] = [
  { id: "string", name: "Text", icon: Icons.Type },
  { id: "number", name: "Number", icon: Icons.Hash },
  { id: "boolean", name: "Boolean", icon: Icons.ToggleLeft },
  { id: "date", name: "Date", icon: Icons.Calendar },
  { id: "email", name: "Email", icon: Icons.Mail },
  { id: "url", name: "URL", icon: Icons.Link },
  { id: "phone", name: "Phone", icon: Icons.Phone },
  { id: "currency", name: "Currency", icon: Icons.DollarSign },
  { id: "array", name: "Array", icon: Icons.List },
  { id: "object", name: "Object", icon: Icons.Braces },
];

export interface FieldTypeSelectorProps {
  value: FieldType;
  onChange: (value: FieldType) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

export const FieldTypeSelector = memo(function FieldTypeSelectorComponent({
  value,
  onChange,
  disabled,
  className,
  compact = false,
}: FieldTypeSelectorProps) {
  const handleChange = useCallback(
    (newValue: string) => {
      onChange(newValue as FieldType);
    },
    [onChange]
  );

  const selectedType = FIELD_TYPES.find((t) => t.id === value);
  const SelectedIcon = selectedType?.icon ?? Icons.Type;

  return (
    <Select disabled={disabled} onValueChange={handleChange} value={value}>
      <SelectTrigger
        className={cn(compact ? "h-8 w-[110px]" : "h-9", className)}
      >
        <SelectValue>
          <span className="flex items-center gap-2">
            <SelectedIcon className="size-3.5 text-muted-foreground" />
            <span className={cn(compact && "text-xs")}>
              {selectedType?.name ?? "Select"}
            </span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {FIELD_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <SelectItem key={type.id} value={type.id}>
              <span className="flex items-center gap-2">
                <Icon className="size-3.5 text-muted-foreground" />
                <span>{type.name}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
});

FieldTypeSelector.displayName = "FieldTypeSelector";

export { FIELD_TYPES };
