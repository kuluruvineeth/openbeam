"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ClassifyCategory } from "@openplane/types/canvas";
import { memo, useCallback, useState } from "react";
import { cn } from "../../../utils";
import { Badge } from "../../badge";
import { Button } from "../../button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../collapsible";
import {
  ColorSwatches,
  DEFAULT_COLOR_OPTIONS,
} from "../../forms/color-swatches";
import { Icons } from "../../icons";
import { Input } from "../../input";
import { Textarea } from "../../textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../tooltip";

export interface CategoryCardProps {
  category: ClassifyCategory;
  onChange: (category: ClassifyCategory) => void;
  onDelete: () => void;
  disabled?: boolean;
  className?: string;
  sortable?: boolean;
}

export const CategoryCard = memo(function CategoryCardComponent({
  category,
  onChange,
  onDelete,
  disabled,
  className,
  sortable = true,
}: CategoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: category.id,
    disabled: !sortable || disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...category, name: e.target.value });
    },
    [category, onChange]
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange({ ...category, description: e.target.value || undefined });
    },
    [category, onChange]
  );

  const handleExamplesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const examples = e.target.value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      onChange({
        ...category,
        examples: examples.length > 0 ? examples : undefined,
      });
    },
    [category, onChange]
  );

  const handleKeywordsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const keywords = e.target.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      onChange({
        ...category,
        keywords: keywords.length > 0 ? keywords : undefined,
      });
    },
    [category, onChange]
  );

  const handleColorChange = useCallback(
    (color: string) => {
      onChange({ ...category, color: color || undefined });
    },
    [category, onChange]
  );

  const handleFallbackToggle = useCallback(() => {
    onChange({ ...category, isFallback: !category.isFallback });
  }, [category, onChange]);

  const categoryColor =
    category.color ?? DEFAULT_COLOR_OPTIONS[0]?.value ?? "#3b82f6";

  return (
    <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
      <div
        className={cn(
          "group rounded-md border border-border/50 bg-muted/30",
          "transition-colors hover:border-border hover:bg-muted/50",
          isDragging && "z-50 opacity-90 shadow-md",
          disabled && "pointer-events-none opacity-50",
          category.isFallback && "border-amber-500/50 bg-amber-500/5",
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

          <div
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: categoryColor }}
          />

          <Input
            className="h-7 min-w-0 flex-1 font-medium text-sm"
            disabled={disabled}
            onChange={handleNameChange}
            placeholder="Category name"
            value={category.name}
          />

          {category.isFallback && (
            <Badge className="shrink-0" variant="outline">
              Fallback
            </Badge>
          )}

          <CollapsibleTrigger asChild>
            <Button
              className="size-6 shrink-0"
              disabled={disabled}
              size="icon"
              variant="ghost"
            >
              <Icons.ChevronDown
                className={cn(
                  "size-3.5 text-muted-foreground transition-transform",
                  isExpanded && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>

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

        <CollapsibleContent>
          <div className="space-y-3 border-border/30 border-t px-3 py-3">
            <div className="space-y-1.5">
              <label
                className="text-muted-foreground text-xs"
                htmlFor={`description-${category.id}`}
              >
                Description
              </label>
              <Textarea
                className="min-h-[60px] resize-none text-sm"
                disabled={disabled}
                id={`description-${category.id}`}
                onChange={handleDescriptionChange}
                placeholder="Describe when to classify as this category..."
                value={category.description ?? ""}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-muted-foreground text-xs"
                htmlFor={`examples-${category.id}`}
              >
                Examples (one per line)
              </label>
              <Textarea
                className="min-h-[60px] resize-none font-mono text-xs"
                disabled={disabled}
                id={`examples-${category.id}`}
                onChange={handleExamplesChange}
                placeholder={
                  '"How do I reset my password?"\n"I need help with login"'
                }
                value={category.examples?.join("\n") ?? ""}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-muted-foreground text-xs"
                htmlFor={`keywords-${category.id}`}
              >
                Keywords (comma-separated)
              </label>
              <Input
                className="h-7 text-sm"
                disabled={disabled}
                id={`keywords-${category.id}`}
                onChange={handleKeywordsChange}
                placeholder="help, support, issue"
                value={category.keywords?.join(", ") ?? ""}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1.5">
                <span className="text-muted-foreground text-xs">Color</span>
                <ColorSwatches
                  disabled={disabled}
                  onChange={handleColorChange}
                  value={categoryColor}
                />
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={cn(
                      "h-7 gap-1.5 text-xs",
                      category.isFallback &&
                        "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                    )}
                    disabled={disabled}
                    onClick={handleFallbackToggle}
                    size="sm"
                    variant="outline"
                  >
                    <Icons.AlertCircle className="size-3" />
                    {category.isFallback ? "Is Fallback" : "Set as Fallback"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Fallback category for unmatched inputs
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
});

CategoryCard.displayName = "CategoryCard";
