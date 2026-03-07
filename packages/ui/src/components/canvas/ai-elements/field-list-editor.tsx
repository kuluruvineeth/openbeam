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
import type { ExtractionField } from "@openbeam/types/canvas";
import { memo, useCallback, useMemo } from "react";
import { cn } from "../../../utils";
import { Button } from "../../button";
import { Icons } from "../../icons";
import { FieldDefinitionRow } from "./field-definition-row";

export interface FieldListEditorProps {
  fields: ExtractionField[];
  onChange: (fields: ExtractionField[]) => void;
  disabled?: boolean;
  className?: string;
  maxFields?: number;
}

function generateFieldId(): string {
  return `field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function createEmptyField(): ExtractionField {
  return {
    id: generateFieldId(),
    name: "",
    type: "string",
    required: false,
  };
}

export const FieldListEditor = memo(function FieldListEditorComponent({
  fields,
  onChange,
  disabled,
  className,
  maxFields = 50,
}: FieldListEditorProps) {
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
    (index: number, updatedField: ExtractionField) => {
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
                <FieldDefinitionRow
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
            <Icons.ListTree className="mx-auto size-8 text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">No fields defined</p>
            <p className="text-muted-foreground/70 text-xs">
              Add fields to extract from your content
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
        Add Field
        {!canAddMore && (
          <span className="ml-1 text-muted-foreground">({maxFields} max)</span>
        )}
      </Button>

      {hasFields && (
        <p className="text-center text-muted-foreground/70 text-xs">
          {fields.length} field{fields.length !== 1 ? "s" : ""} defined
          {fields.filter((f) => f.required).length > 0 && (
            <span> · {fields.filter((f) => f.required).length} required</span>
          )}
        </p>
      )}
    </div>
  );
});

FieldListEditor.displayName = "FieldListEditor";
