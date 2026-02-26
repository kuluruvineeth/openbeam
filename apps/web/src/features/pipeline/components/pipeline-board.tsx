"use client";

import { closestCorners, DndContext, DragOverlay } from "@dnd-kit/core";
import { cn } from "@openplane/ui";
import { useCallback, useMemo } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { COLUMN_WIDTH } from "../constants";
import { usePipelineData } from "../hooks/use-pipeline-data";
import { usePipelineDnd } from "../hooks/use-pipeline-dnd";
import { sortColumnsByOrder } from "../lib/pipeline-utils";
import { usePipelineStore } from "../stores/pipeline-store";
import type {
  PipelineCard as PipelineCardType,
  PipelineDragResult,
} from "../types";
import { PipelineCardContent } from "./pipeline-card";
import { PipelineColumnDroppable } from "./pipeline-column";
import { PipelineFilters } from "./pipeline-filters";
import { PipelineHeader } from "./pipeline-header";

type PipelineBoardProps = {
  title?: string;
  initialCards?: PipelineCardType[];
  onCardMoved?: (result: PipelineDragResult) => void | Promise<void>;
  onCardClick?: (cardId: string) => void;
  className?: string;
};

export function PipelineBoard({
  title = "Pipeline",
  initialCards,
  onCardMoved,
  onCardClick,
  className,
}: PipelineBoardProps) {
  const focusedCardId = usePipelineStore((s) => s.focusedCardId);
  const focusedColumnIndex = usePipelineStore((s) => s.focusedColumnIndex);
  const setFocusedCard = usePipelineStore((s) => s.setFocusedCard);
  const setFocusedColumnIndex = usePipelineStore(
    (s) => s.setFocusedColumnIndex
  );

  const {
    cards,
    groupedCards,
    columns,
    totalCount,
    filteredCount,
    handleCardMove,
  } = usePipelineData({ initialCards, onCardMoved });

  const {
    sensors,
    activeCard,
    overColumnId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = usePipelineDnd({ cards, onCardMove: handleCardMove });

  const sortedColumns = useMemo(() => sortColumnsByOrder(columns), [columns]);

  const navigateToCard = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      if (sortedColumns.length === 0) {
        return;
      }

      const colIdx = focusedColumnIndex;
      const currentColumn = sortedColumns[colIdx];
      if (!currentColumn) {
        return;
      }

      const columnCards = groupedCards.get(currentColumn.id) ?? [];

      if (direction === "left" || direction === "right") {
        const nextIdx =
          direction === "left"
            ? Math.max(0, colIdx - 1)
            : Math.min(sortedColumns.length - 1, colIdx + 1);
        setFocusedColumnIndex(nextIdx);
        const nextColumn = sortedColumns[nextIdx];
        if (!nextColumn) {
          return;
        }
        const nextCards = groupedCards.get(nextColumn.id) ?? [];
        setFocusedCard(nextCards[0]?.id ?? null);
        return;
      }

      const currentIdx = focusedCardId
        ? columnCards.findIndex((c) => c.id === focusedCardId)
        : -1;

      if (direction === "up") {
        const prevIdx = Math.max(0, currentIdx - 1);
        setFocusedCard(columnCards[prevIdx]?.id ?? null);
      } else {
        const nextIdx = Math.min(columnCards.length - 1, currentIdx + 1);
        setFocusedCard(columnCards[nextIdx]?.id ?? null);
      }
    },
    [
      sortedColumns,
      focusedColumnIndex,
      focusedCardId,
      groupedCards,
      setFocusedCard,
      setFocusedColumnIndex,
    ]
  );

  useHotkeys("up", () => navigateToCard("up"), { preventDefault: true });
  useHotkeys("down", () => navigateToCard("down"), { preventDefault: true });
  useHotkeys("left", () => navigateToCard("left"), { preventDefault: true });
  useHotkeys("right", () => navigateToCard("right"), { preventDefault: true });
  useHotkeys("enter", () => {
    if (focusedCardId) {
      onCardClick?.(focusedCardId);
    }
  });
  useHotkeys("escape", () => setFocusedCard(null));

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <PipelineHeader
        filteredCount={filteredCount}
        title={title}
        totalCount={totalCount}
      />

      <PipelineFilters cards={cards} />

      <DndContext
        collisionDetection={closestCorners}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <div
          className="flex gap-3 overflow-x-auto pb-4"
          style={{ minHeight: 400 }}
        >
          {sortedColumns.map((column) => (
            <PipelineColumnDroppable
              cards={groupedCards.get(column.id) ?? []}
              column={column}
              focusedCardId={focusedCardId}
              isOver={overColumnId === column.id}
              key={column.id}
              onCardClick={onCardClick}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <div
              className="rounded-md border border-primary/50 bg-background p-3 shadow-sm"
              style={{ width: COLUMN_WIDTH - 16, transform: "rotate(2deg)" }}
            >
              <PipelineCardContent card={activeCard} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
