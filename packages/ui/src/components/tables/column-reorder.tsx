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
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../../utils/cn";

interface DraggableColumnProps {
  id: string;
  children: ReactNode;
}

function DraggableColumn({ id, children }: DraggableColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      className={cn("flex items-center gap-1", isDragging && "z-50 opacity-50")}
      ref={setNodeRef}
      style={style}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab rounded p-1 hover:bg-muted active:cursor-grabbing"
        type="button"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </button>
      {children}
    </div>
  );
}

interface ColumnReorderProps {
  columns: string[];
  onReorder: (columns: string[]) => void;
  renderColumn: (id: string) => ReactNode;
  className?: string;
}

function ColumnReorder({
  columns,
  onReorder,
  renderColumn,
  className,
}: ColumnReorderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = columns.indexOf(String(active.id));
      const newIndex = columns.indexOf(String(over.id));
      onReorder(arrayMove(columns, oldIndex, newIndex));
    }
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <SortableContext items={columns} strategy={horizontalListSortingStrategy}>
        <div className={cn("flex items-center gap-2", className)}>
          {columns.map((id) => (
            <DraggableColumn id={id} key={id}>
              {renderColumn(id)}
            </DraggableColumn>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export { ColumnReorder, DraggableColumn };
export type { ColumnReorderProps, DraggableColumnProps };
