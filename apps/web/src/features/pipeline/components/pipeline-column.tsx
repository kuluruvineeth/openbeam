"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@openbeam/ui";
import { cva, type VariantProps } from "class-variance-authority";
import { COLUMN_WIDTH } from "../constants";
import type {
  PipelineCard as PipelineCardType,
  PipelineColumn as PipelineColumnType,
} from "../types";
import { PipelineCardDraggable } from "./pipeline-card";
import { PipelineEmpty } from "./pipeline-empty";

const columnVariants = cva(
  "flex flex-shrink-0 flex-col rounded-md border transition-colors duration-150",
  {
    variants: {
      state: {
        default: "border-border/50 bg-muted/30",
        active: "border-primary/30 bg-primary/5",
      },
    },
    defaultVariants: {
      state: "default",
    },
  }
);

type PipelineColumnProps = {
  column: PipelineColumnType;
  cards: PipelineCardType[];
  isOver: boolean;
  focusedCardId: string | null;
  onCardClick?: (cardId: string) => void;
  className?: string;
};

export function PipelineColumnDroppable({
  column,
  cards,
  isOver,
  focusedCardId,
  onCardClick,
  className,
}: PipelineColumnProps) {
  const { setNodeRef } = useDroppable({ id: `column:${column.id}` });

  const state: VariantProps<typeof columnVariants>["state"] = isOver
    ? "active"
    : "default";

  return (
    <div
      className={cn(columnVariants({ state }), className)}
      ref={setNodeRef}
      style={{ width: COLUMN_WIDTH }}
    >
      <div className="flex items-center gap-2 border-border/50 border-b px-3 py-2.5">
        <span
          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
          style={{ background: column.color }}
        />
        <span className="flex-1 truncate font-medium text-sm">
          {column.name}
        </span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
          {cards.length}
        </span>
      </div>

      <div
        className="flex-1 space-y-2 overflow-y-auto p-2"
        style={{ minHeight: 80 }}
      >
        {cards.length === 0 ? (
          <PipelineEmpty state={isOver ? "active" : "idle"} />
        ) : (
          cards.map((card) => (
            <PipelineCardDraggable
              card={card}
              isFocused={focusedCardId === card.id}
              key={card.id}
              onCardClick={onCardClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
