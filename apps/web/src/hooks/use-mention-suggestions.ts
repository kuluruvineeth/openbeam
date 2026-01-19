"use client";

import { useCallback, useMemo, useState } from "react";

interface MentionItem {
  id: string;
  label: string;
  type: "user" | "document" | "connector";
  icon?: string;
  description?: string;
}

interface UseMentionSuggestionsOptions {
  items: MentionItem[];
  maxSuggestions?: number;
}

interface UseMentionSuggestionsReturn {
  query: string;
  setQuery: (query: string) => void;
  suggestions: MentionItem[];
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  getSelectedItem: () => MentionItem | undefined;
  reset: () => void;
}

export function useMentionSuggestions(
  options: UseMentionSuggestionsOptions
): UseMentionSuggestionsReturn {
  const { items, maxSuggestions = 5 } = options;
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const suggestions = useMemo(() => {
    if (!query) {
      return [];
    }

    const normalizedQuery = query.toLowerCase();
    return items
      .filter(
        (item) =>
          item.label.toLowerCase().includes(normalizedQuery) ||
          item.description?.toLowerCase().includes(normalizedQuery)
      )
      .slice(0, maxSuggestions);
  }, [items, query, maxSuggestions]);

  const selectNext = useCallback(() => {
    setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
  }, [suggestions.length]);

  const selectPrevious = useCallback(() => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
  }, [suggestions.length]);

  const getSelectedItem = useCallback(
    () => suggestions[selectedIndex],
    [suggestions, selectedIndex]
  );

  const reset = useCallback(() => {
    setQuery("");
    setSelectedIndex(0);
  }, []);

  return {
    query,
    setQuery,
    suggestions,
    selectedIndex,
    setSelectedIndex,
    selectNext,
    selectPrevious,
    getSelectedItem,
    reset,
  };
}

export type { MentionItem };
