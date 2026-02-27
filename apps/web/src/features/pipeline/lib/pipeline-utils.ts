import type {
  PipelineCard,
  PipelineColumn,
  PipelineFilterState,
} from "../types";

export function groupCardsByColumn(
  cards: PipelineCard[],
  columns: PipelineColumn[]
): Map<string, PipelineCard[]> {
  const grouped = new Map<string, PipelineCard[]>();
  for (const col of columns) {
    grouped.set(col.id, []);
  }

  for (const card of cards) {
    const existing = grouped.get(card.columnId);
    if (existing) {
      existing.push(card);
    }
  }

  return grouped;
}

export function filterCards(
  cards: PipelineCard[],
  filters: PipelineFilterState
): PipelineCard[] {
  const searchLower = filters.search.toLowerCase();

  return cards.filter((card) => {
    if (searchLower && !card.title.toLowerCase().includes(searchLower)) {
      const fieldMatch = card.fields.some((f) =>
        f.value.toLowerCase().includes(searchLower)
      );
      if (!fieldMatch) {
        return false;
      }
    }

    if (filters.tags.length > 0) {
      const hasTag = filters.tags.some((tag) => card.tags.includes(tag));
      if (!hasTag) {
        return false;
      }
    }

    if (
      filters.assigneeIds.length > 0 &&
      !(card.assigneeId && filters.assigneeIds.includes(card.assigneeId))
    ) {
      return false;
    }

    return true;
  });
}

export function moveCardToColumn(
  cards: PipelineCard[],
  cardId: string,
  targetColumnId: string
): PipelineCard[] {
  return cards.map((card) =>
    card.id === cardId ? { ...card, columnId: targetColumnId } : card
  );
}

export function sortColumnsByOrder(
  columns: PipelineColumn[]
): PipelineColumn[] {
  return [...columns].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getColumnCardCount(
  cards: PipelineCard[],
  columnId: string
): number {
  let count = 0;
  for (const card of cards) {
    if (card.columnId === columnId) {
      count += 1;
    }
  }
  return count;
}

export function extractUniqueTags(cards: PipelineCard[]): string[] {
  const tagSet = new Set<string>();
  for (const card of cards) {
    for (const tag of card.tags) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet).sort();
}

export function extractUniqueAssignees(
  cards: PipelineCard[]
): Array<{ id: string; name: string }> {
  const assigneeMap = new Map<string, string>();
  for (const card of cards) {
    if (card.assigneeId && card.assigneeName) {
      assigneeMap.set(card.assigneeId, card.assigneeName);
    }
  }
  return Array.from(assigneeMap.entries()).map(([id, name]) => ({ id, name }));
}
