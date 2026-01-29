"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { InputVariable } from "@openplane/types/canvas";
import { memo, useCallback, useMemo } from "react";
import { cn } from "../../../utils";
import { Button } from "../../button";
import { Icons } from "../../icons";
import { InputVariableRow } from "./input-variable-row";

export interface InputVariableMapperProps {
  variables: InputVariable[];
  onChange: (variables: InputVariable[]) => void;
  disabled?: boolean;
  className?: string;
  maxVariables?: number;
}

function generateVariableId(): string {
  return `var_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function createEmptyVariable(): InputVariable {
  return {
    id: generateVariableId(),
    name: "",
    type: "any",
    required: true,
  };
}

export const InputVariableMapper = memo(function InputVariableMapperComponent({
  variables,
  onChange,
  disabled,
  className,
  maxVariables = 20,
}: InputVariableMapperProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const variableIds = useMemo(() => variables.map((v) => v.id), [variables]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = variables.findIndex((v) => v.id === active.id);
        const newIndex = variables.findIndex((v) => v.id === over.id);
        onChange(arrayMove(variables, oldIndex, newIndex));
      }
    },
    [variables, onChange]
  );

  const handleAddVariable = useCallback(() => {
    if (variables.length >= maxVariables) {
      return;
    }
    onChange([...variables, createEmptyVariable()]);
  }, [variables, maxVariables, onChange]);

  const handleUpdateVariable = useCallback(
    (index: number, updatedVariable: InputVariable) => {
      const newVariables = [...variables];
      newVariables[index] = updatedVariable;
      onChange(newVariables);
    },
    [variables, onChange]
  );

  const handleDeleteVariable = useCallback(
    (index: number) => {
      onChange(variables.filter((_, i) => i !== index));
    },
    [variables, onChange]
  );

  const canAddMore = variables.length < maxVariables;
  const hasVariables = variables.length > 0;

  return (
    <div className={cn("space-y-2", className)}>
      {hasVariables ? (
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          sensors={sensors}
        >
          <SortableContext
            items={variableIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1.5">
              {variables.map((variable, index) => (
                <InputVariableRow
                  disabled={disabled}
                  key={variable.id}
                  onChange={(updated) => handleUpdateVariable(index, updated)}
                  onDelete={() => handleDeleteVariable(index)}
                  variable={variable}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex items-center justify-center rounded-md border border-border/50 border-dashed py-6 text-center">
          <div className="space-y-1">
            <Icons.Braces className="mx-auto size-8 text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">No input variables</p>
            <p className="text-muted-foreground/70 text-xs">
              Add variables to pass data into your code
            </p>
          </div>
        </div>
      )}

      <Button
        className="w-full"
        disabled={disabled || !canAddMore}
        onClick={handleAddVariable}
        size="sm"
        variant="outline"
      >
        <Icons.Plus className="mr-1.5 size-3.5" />
        Add Variable
        {!canAddMore && (
          <span className="ml-1 text-muted-foreground">
            ({maxVariables} max)
          </span>
        )}
      </Button>

      {hasVariables && (
        <p className="text-center text-muted-foreground/70 text-xs">
          {variables.length} variable{variables.length !== 1 ? "s" : ""}
          {variables.filter((v) => v.required).length > 0 && (
            <span>
              {" "}
              · {variables.filter((v) => v.required).length} required
            </span>
          )}
        </p>
      )}
    </div>
  );
});

InputVariableMapper.displayName = "InputVariableMapper";
