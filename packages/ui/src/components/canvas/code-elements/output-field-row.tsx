"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CodeVariableType, OutputField } from "@openbeam/types/canvas";
import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Button } from "../../button";
import { Checkbox } from "../../checkbox";
import { Icons } from "../../icons";
import { Input } from "../../input";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../tooltip";
import { VariableTypeSelector } from "./variable-type-selector";

export interface OutputFieldRowProps {
  field: OutputField;
  onChange: (field: OutputField) => void;
  onDelete: () => void;
  disabled?: boolean;
  className?: string;
  sortable?: boolean;
}

export const OutputFieldRow = memo(function OutputFieldRowComponent({
  field,
  onChange,
  onDelete,
  disabled,
  className,
  sortable = true,
}: OutputFieldRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: field.id,
    disabled: !sortable || disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const name = e.target.value;
      const id = name
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
      onChange({ ...field, name, id: id || field.id });
    },
    [field, onChange]
  );

  const handleTypeChange = useCallback(
    (type: CodeVariableType) => {
      onChange({ ...field, type });
    },
    [field, onChange]
  );

  const handleNullableChange = useCallback(
    (checked: boolean) => {
      onChange({ ...field, nullable: checked });
    },
    [field, onChange]
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...field, description: e.target.value || undefined });
    },
    [field, onChange]
  );

  return (
    <div
      className={cn(
        "group rounded-md border border-border/50 bg-muted/30",
        "transition-colors hover:border-border hover:bg-muted/50",
        isDragging && "z-50 opacity-90 shadow-md",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      ref={setNodeRef}
      style={style}
    >
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        {sortable && (
          <button
            className={cn(
              "touch-none text-muted-foreground/50 hover:text-muted-foreground",
              "cursor-grab active:cursor-grabbing"
            )}
            type="button"
            {...attributes}
            {...listeners}
          >
            <Icons.GripVertical className="size-4" />
          </button>
        )}

        <Input
          className="h-7 min-w-0 flex-1 font-mono text-sm"
          disabled={disabled}
          onChange={handleNameChange}
          placeholder="outputField"
          value={field.name}
        />

        <VariableTypeSelector
          compact
          disabled={disabled}
          onChange={handleTypeChange}
          value={field.type}
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex shrink-0 items-center">
              <Checkbox
                checked={field.nullable}
                disabled={disabled}
                onCheckedChange={handleNullableChange}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">Nullable field</TooltipContent>
        </Tooltip>

        <Button
          className="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          disabled={disabled}
          onClick={onDelete}
          size="icon"
          variant="ghost"
        >
          <Icons.Trash className="size-3.5 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>

      <div className="border-border/30 border-t px-2 py-1.5">
        <Input
          className="h-6 text-xs"
          disabled={disabled}
          onChange={handleDescriptionChange}
          placeholder="Description (optional)..."
          value={field.description ?? ""}
        />
      </div>
    </div>
  );
});

OutputFieldRow.displayName = "OutputFieldRow";
