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
import type { ClassifyCategory } from "@openbeam/types/canvas";
import { memo, useCallback, useMemo } from "react";
import { cn } from "../../../utils";
import { Button } from "../../button";
import { DEFAULT_COLOR_OPTIONS } from "../../forms/color-swatches";
import { Icons } from "../../icons";
import { CategoryCard } from "./category-card";

export interface CategoryListEditorProps {
  categories: ClassifyCategory[];
  onChange: (categories: ClassifyCategory[]) => void;
  disabled?: boolean;
  className?: string;
  maxCategories?: number;
}

function generateCategoryId(): string {
  return `cat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function createEmptyCategory(index: number): ClassifyCategory {
  return {
    id: generateCategoryId(),
    name: "",
    color: DEFAULT_COLOR_OPTIONS[index % DEFAULT_COLOR_OPTIONS.length]?.value,
  };
}

export const CategoryListEditor = memo(function CategoryListEditorComponent({
  categories,
  onChange,
  disabled,
  className,
  maxCategories = 20,
}: CategoryListEditorProps) {
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

  const categoryIds = useMemo(() => categories.map((c) => c.id), [categories]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = categories.findIndex((c) => c.id === active.id);
        const newIndex = categories.findIndex((c) => c.id === over.id);
        onChange(arrayMove(categories, oldIndex, newIndex));
      }
    },
    [categories, onChange]
  );

  const handleAddCategory = useCallback(() => {
    if (categories.length >= maxCategories) {
      return;
    }
    onChange([...categories, createEmptyCategory(categories.length)]);
  }, [categories, maxCategories, onChange]);

  const handleUpdateCategory = useCallback(
    (index: number, updatedCategory: ClassifyCategory) => {
      const hasFallbackChange =
        updatedCategory.isFallback &&
        categories.some((c, i) => i !== index && c.isFallback);

      if (hasFallbackChange) {
        const newCategories = categories.map((c, i) => {
          if (i === index) {
            return updatedCategory;
          }
          return { ...c, isFallback: false };
        });
        onChange(newCategories);
      } else {
        const newCategories = [...categories];
        newCategories[index] = updatedCategory;
        onChange(newCategories);
      }
    },
    [categories, onChange]
  );

  const handleDeleteCategory = useCallback(
    (index: number) => {
      onChange(categories.filter((_, i) => i !== index));
    },
    [categories, onChange]
  );

  const canAddMore = categories.length < maxCategories;
  const hasCategories = categories.length > 0;
  const fallbackCount = categories.filter((c) => c.isFallback).length;

  return (
    <div className={cn("space-y-2", className)}>
      {hasCategories ? (
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          sensors={sensors}
        >
          <SortableContext
            items={categoryIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1.5">
              {categories.map((category, index) => (
                <CategoryCard
                  category={category}
                  disabled={disabled}
                  key={category.id}
                  onChange={(updated) => handleUpdateCategory(index, updated)}
                  onDelete={() => handleDeleteCategory(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex items-center justify-center rounded-md border border-border/50 border-dashed py-6 text-center">
          <div className="space-y-1">
            <Icons.Tags className="mx-auto size-8 text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">
              No categories defined
            </p>
            <p className="text-muted-foreground/70 text-xs">
              Add categories to classify your content
            </p>
          </div>
        </div>
      )}

      <Button
        className="w-full"
        disabled={disabled || !canAddMore}
        onClick={handleAddCategory}
        size="sm"
        variant="outline"
      >
        <Icons.Plus className="mr-1.5 size-3.5" />
        Add Category
        {!canAddMore && (
          <span className="ml-1 text-muted-foreground">
            ({maxCategories} max)
          </span>
        )}
      </Button>

      {hasCategories && (
        <p className="text-center text-muted-foreground/70 text-xs">
          {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
          {fallbackCount > 0 && (
            <span className="text-amber-500"> · {fallbackCount} fallback</span>
          )}
        </p>
      )}
    </div>
  );
});

CategoryListEditor.displayName = "CategoryListEditor";
