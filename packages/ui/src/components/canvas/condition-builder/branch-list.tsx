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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ConditionBranch } from "@openplane/types/canvas";
import { BRANCH_COLORS } from "@openplane/types/canvas";
import { forwardRef, memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Button } from "../../button";
import { Icons } from "../../icons";
import { BranchCard } from "./branch-card";

interface BranchListProps {
  branches: ConditionBranch[];
  onChange: (branches: ConditionBranch[]) => void;
  fieldSuggestions?: string[];
  className?: string;
}

interface SortableBranchItemProps {
  branch: ConditionBranch;
  index: number;
  onChange: (branch: ConditionBranch) => void;
  onDelete: () => void;
  fieldSuggestions?: string[];
}

const SortableBranchItem = memo(function SortableBranchItemComponent({
  branch,
  index,
  onChange,
  onDelete,
  fieldSuggestions,
}: SortableBranchItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: branch.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <BranchCard
        branch={branch}
        className={isDragging ? "opacity-90" : undefined}
        dragHandleProps={{ ...attributes, ...listeners }}
        fieldSuggestions={fieldSuggestions}
        index={index}
        isDragging={isDragging}
        onChange={onChange}
        onDelete={onDelete}
      />
    </div>
  );
});

SortableBranchItem.displayName = "SortableBranchItem";

export const BranchList = memo(
  forwardRef<HTMLDivElement, BranchListProps>(function BranchListComponent(
    { branches, onChange, fieldSuggestions, className },
    ref
  ) {
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

    const handleDragEnd = useCallback(
      (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
          const oldIndex = branches.findIndex((b) => b.id === active.id);
          const newIndex = branches.findIndex((b) => b.id === over.id);
          const reordered = arrayMove(branches, oldIndex, newIndex);
          onChange(reordered);
        }
      },
      [branches, onChange]
    );

    const handleAddBranch = useCallback(() => {
      const newBranch: ConditionBranch = {
        id: crypto.randomUUID(),
        label: `Branch ${branches.length + 1}`,
        color: BRANCH_COLORS[branches.length % BRANCH_COLORS.length],
        groups: [
          {
            id: crypto.randomUUID(),
            logic: "and",
            conditions: [],
          },
        ],
      };
      onChange([...branches, newBranch]);
    }, [branches, onChange]);

    const handleBranchChange = useCallback(
      (index: number, branch: ConditionBranch) => {
        const newBranches = [...branches];
        newBranches[index] = branch;
        onChange(newBranches);
      },
      [branches, onChange]
    );

    const handleBranchDelete = useCallback(
      (index: number) => {
        const newBranches = branches.filter((_, i) => i !== index);
        onChange(newBranches);
      },
      [branches, onChange]
    );

    return (
      <div className={cn("space-y-3", className)} ref={ref}>
        {branches.length === 0 ? (
          <div className="rounded-md border border-border/50 border-dashed py-8 text-center">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-secondary">
              <Icons.GitBranch className="size-5 text-muted-foreground" />
            </div>
            <p className="font-medium text-sm">No branches defined</p>
            <p className="mt-1 text-muted-foreground text-xs">
              Add branches to create different execution paths based on
              conditions
            </p>
            <Button
              className="mt-4"
              onClick={handleAddBranch}
              size="sm"
              variant="outline"
            >
              <Icons.Plus className="mr-1 size-3.5" />
              Add first branch
            </Button>
          </div>
        ) : (
          <>
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              sensors={sensors}
            >
              <SortableContext
                items={branches.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                {branches.map((branch, index) => (
                  <SortableBranchItem
                    branch={branch}
                    fieldSuggestions={fieldSuggestions}
                    index={index}
                    key={branch.id}
                    onChange={(b) => handleBranchChange(index, b)}
                    onDelete={() => handleBranchDelete(index)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <Button
              className="h-9 w-full"
              onClick={handleAddBranch}
              size="sm"
              variant="outline"
            >
              <Icons.Plus className="mr-1 size-4" />
              Add branch
            </Button>
          </>
        )}
      </div>
    );
  })
);

BranchList.displayName = "BranchList";
