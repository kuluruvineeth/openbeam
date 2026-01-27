"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CodeVariableType, InputVariable } from "@openplane/types/canvas";
import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Button } from "../../button";
import { Checkbox } from "../../checkbox";
import { Icons } from "../../icons";
import { Input } from "../../input";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../tooltip";
import { VariableTypeSelector } from "./variable-type-selector";

export interface InputVariableRowProps {
  variable: InputVariable;
  onChange: (variable: InputVariable) => void;
  onDelete: () => void;
  disabled?: boolean;
  className?: string;
  sortable?: boolean;
}

export const InputVariableRow = memo(function InputVariableRowComponent({
  variable,
  onChange,
  onDelete,
  disabled,
  className,
  sortable = true,
}: InputVariableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: variable.id,
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
      onChange({ ...variable, name, id: id || variable.id });
    },
    [variable, onChange]
  );

  const handleTypeChange = useCallback(
    (type: CodeVariableType) => {
      onChange({ ...variable, type });
    },
    [variable, onChange]
  );

  const handleRequiredChange = useCallback(
    (checked: boolean) => {
      onChange({ ...variable, required: checked });
    },
    [variable, onChange]
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...variable, description: e.target.value || undefined });
    },
    [variable, onChange]
  );

  const handleSourcePathChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...variable, sourcePath: e.target.value || undefined });
    },
    [variable, onChange]
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
          placeholder="variableName"
          value={variable.name}
        />

        <VariableTypeSelector
          compact
          disabled={disabled}
          onChange={handleTypeChange}
          value={variable.type}
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex shrink-0 items-center">
              <Checkbox
                checked={variable.required}
                disabled={disabled}
                onCheckedChange={handleRequiredChange}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">Required variable</TooltipContent>
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

      <div className="flex gap-2 border-border/30 border-t px-2 py-1.5">
        <Input
          className="h-6 flex-1 text-xs"
          disabled={disabled}
          onChange={handleDescriptionChange}
          placeholder="Description (optional)..."
          value={variable.description ?? ""}
        />
        <Input
          className="h-6 w-32 font-mono text-xs"
          disabled={disabled}
          onChange={handleSourcePathChange}
          placeholder="$.data.field"
          value={variable.sourcePath ?? ""}
        />
      </div>
    </div>
  );
});

InputVariableRow.displayName = "InputVariableRow";
