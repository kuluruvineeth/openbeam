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
import type { OutputField } from "@openbeam/types/canvas";
import { memo, useCallback, useMemo } from "react";
import { cn } from "../../../utils";
import { Button } from "../../button";
import { Icons } from "../../icons";
import { OutputFieldRow } from "./output-field-row";

export interface OutputSchemaEditorProps {
  fields: OutputField[];
  onChange: (fields: OutputField[]) => void;
  disabled?: boolean;
  className?: string;
  maxFields?: number;
}

function generateFieldId(): string {
  return `out_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function createEmptyField(): OutputField {
  return {
    id: generateFieldId(),
    name: "",
    type: "any",
    nullable: false,
  };
}

export const OutputSchemaEditor = memo(function OutputSchemaEditorComponent({
  fields,
  onChange,
  disabled,
  className,
  maxFields = 20,
}: OutputSchemaEditorProps) {
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

  const fieldIds = useMemo(() => fields.map((f) => f.id), [fields]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = fields.findIndex((f) => f.id === active.id);
        const newIndex = fields.findIndex((f) => f.id === over.id);
        onChange(arrayMove(fields, oldIndex, newIndex));
      }
    },
    [fields, onChange]
  );

  const handleAddField = useCallback(() => {
    if (fields.length >= maxFields) {
      return;
    }
    onChange([...fields, createEmptyField()]);
  }, [fields, maxFields, onChange]);

  const handleUpdateField = useCallback(
    (index: number, updatedField: OutputField) => {
      const newFields = [...fields];
      newFields[index] = updatedField;
      onChange(newFields);
    },
    [fields, onChange]
  );

  const handleDeleteField = useCallback(
    (index: number) => {
      onChange(fields.filter((_, i) => i !== index));
    },
    [fields, onChange]
  );

  const canAddMore = fields.length < maxFields;
  const hasFields = fields.length > 0;

  return (
    <div className={cn("space-y-2", className)}>
      {hasFields ? (
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          sensors={sensors}
        >
          <SortableContext
            items={fieldIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1.5">
              {fields.map((field, index) => (
                <OutputFieldRow
                  disabled={disabled}
                  field={field}
                  key={field.id}
                  onChange={(updated) => handleUpdateField(index, updated)}
                  onDelete={() => handleDeleteField(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex items-center justify-center rounded-md border border-border/50 border-dashed py-6 text-center">
          <div className="space-y-1">
            <Icons.Braces className="mx-auto size-8 text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">No output schema</p>
            <p className="text-muted-foreground/70 text-xs">
              Define the structure of your code output
            </p>
          </div>
        </div>
      )}

      <Button
        className="w-full"
        disabled={disabled || !canAddMore}
        onClick={handleAddField}
        size="sm"
        variant="outline"
      >
        <Icons.Plus className="mr-1.5 size-3.5" />
        Add Output Field
        {!canAddMore && (
          <span className="ml-1 text-muted-foreground">({maxFields} max)</span>
        )}
      </Button>

      {hasFields && (
        <p className="text-center text-muted-foreground/70 text-xs">
          {fields.length} field{fields.length !== 1 ? "s" : ""}
          {fields.filter((f) => f.nullable).length > 0 && (
            <span> · {fields.filter((f) => f.nullable).length} nullable</span>
          )}
        </p>
      )}
    </div>
  );
});

OutputSchemaEditor.displayName = "OutputSchemaEditor";
