"use client";

import { useCallback, useMemo, useState } from "react";
import {
  filterCards,
  groupCardsByColumn,
  moveCardToColumn,
} from "../lib/pipeline-utils";
import { usePipelineStore } from "../stores/pipeline-store";
import type { PipelineCard, PipelineDragResult } from "../types";

type UsePipelineDataOptions = {
  initialCards?: PipelineCard[];
  onCardMoved?: (result: PipelineDragResult) => void | Promise<void>;
};

export function usePipelineData(options: UsePipelineDataOptions = {}) {
  const [cards, setCards] = useState<PipelineCard[]>(
    options.initialCards ?? []
  );

  const columns = usePipelineStore((s) => s.columns);
  const filters = usePipelineStore((s) => s.filters);

  const filteredCards = useMemo(
    () => filterCards(cards, filters),
    [cards, filters]
  );

  const groupedCards = useMemo(
    () => groupCardsByColumn(filteredCards, columns),
    [filteredCards, columns]
  );

  const totalCount = cards.length;
  const filteredCount = filteredCards.length;

  const { onCardMoved } = options;

  const handleCardMove = useCallback(
    async (result: PipelineDragResult) => {
      const previousCards = cards;
      setCards((prev) =>
        moveCardToColumn(prev, result.cardId, result.targetColumnId)
      );

      try {
        await onCardMoved?.(result);
      } catch {
        setCards(previousCards);
      }
    },
    [cards, onCardMoved]
  );

  return {
    cards,
    filteredCards,
    groupedCards,
    columns,
    totalCount,
    filteredCount,
    handleCardMove,
    setCards,
  };
}
