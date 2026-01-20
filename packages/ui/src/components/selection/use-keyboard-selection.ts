"use client";

import { useCallback, useEffect } from "react";

import { useSelection } from "./use-selection";

interface UseKeyboardSelectionOptions<T extends { id: string }> {
  items: T[];
  enabled?: boolean;
}

export function useKeyboardSelection<T extends { id: string }>({
  items,
  enabled = true,
}: UseKeyboardSelectionOptions<T>) {
  const { selectAll, clear, count } = useSelection<T>();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) {
        return;
      }

      const target = event.target as HTMLElement;
      const isInput = ["INPUT", "TEXTAREA"].includes(target?.tagName);
      const isEditable = target?.isContentEditable;

      if (isInput || isEditable) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "a") {
        event.preventDefault();
        selectAll(items);
      }

      if (event.key === "Escape" && count > 0) {
        event.preventDefault();
        clear();
      }
    },
    [enabled, items, selectAll, clear, count]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { selectAll: () => selectAll(items), clear };
}
