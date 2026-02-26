"use client";

import {
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useCallback, useState } from "react";
import { CARD_DRAG_ACTIVATION_DISTANCE } from "../constants";
import type { PipelineCard, PipelineDragResult } from "../types";

type UsePipelineDndOptions = {
  cards: PipelineCard[];
  onCardMove: (result: PipelineDragResult) => void;
};

export function usePipelineDnd({ cards, onCardMove }: UsePipelineDndOptions) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: CARD_DRAG_ACTIVATION_DISTANCE },
    })
  );

  const activeCard =
    activeCardId !== null
      ? (cards.find((c) => c.id === activeCardId) ?? null)
      : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveCardId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overId = event.over?.id ? String(event.over.id) : null;
    if (overId?.startsWith("column:")) {
      setOverColumnId(overId.replace("column:", ""));
    } else {
      setOverColumnId(null);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const draggedCardId = String(event.active.id);
      const overId = event.over?.id ? String(event.over.id) : null;

      setActiveCardId(null);
      setOverColumnId(null);

      if (!overId?.startsWith("column:")) {
        return;
      }

      const targetColumnId = overId.replace("column:", "");
      const card = cards.find((c) => c.id === draggedCardId);
      if (!card || card.columnId === targetColumnId) {
        return;
      }

      onCardMove({
        cardId: draggedCardId,
        sourceColumnId: card.columnId,
        targetColumnId,
      });
    },
    [cards, onCardMove]
  );

  const handleDragCancel = useCallback(() => {
    setActiveCardId(null);
    setOverColumnId(null);
  }, []);

  return {
    sensors,
    activeCard,
    activeCardId,
    overColumnId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
