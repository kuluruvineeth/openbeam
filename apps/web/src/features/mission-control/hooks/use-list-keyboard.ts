"use client";

import { useHotkeys } from "react-hotkeys-hook";

type UseListKeyboardOptions = {
  enabled: boolean;
  itemCount: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onOpen: (index: number) => void;
  onToggleSelection: (index: number) => void;
  onSelectAll: () => void;
  onFocusSearch: () => void;
  onToggleView: () => void;
  onStatusTab: (tab: number) => void;
};

export function useListKeyboard({
  enabled,
  itemCount,
  selectedIndex,
  onSelect,
  onOpen,
  onToggleSelection,
  onSelectAll,
  onFocusSearch,
  onToggleView,
  onStatusTab,
}: UseListKeyboardOptions) {
  useHotkeys(
    "j, ArrowDown",
    () => {
      const next = Math.min(selectedIndex + 1, itemCount - 1);
      onSelect(next);
    },
    { enabled: enabled && itemCount > 0 }
  );

  useHotkeys(
    "k, ArrowUp",
    () => {
      const prev = Math.max(selectedIndex - 1, 0);
      onSelect(prev);
    },
    { enabled: enabled && itemCount > 0 }
  );

  useHotkeys(
    "Enter",
    () => {
      if (selectedIndex >= 0 && selectedIndex < itemCount) {
        onOpen(selectedIndex);
      }
    },
    { enabled }
  );

  useHotkeys(
    "x",
    () => {
      if (selectedIndex >= 0 && selectedIndex < itemCount) {
        onToggleSelection(selectedIndex);
      }
    },
    { enabled }
  );

  useHotkeys(
    "mod+a",
    (e) => {
      e.preventDefault();
      onSelectAll();
    },
    { enabled }
  );

  useHotkeys(
    "/",
    (e) => {
      e.preventDefault();
      onFocusSearch();
    },
    { enabled }
  );

  useHotkeys("v", () => onToggleView(), { enabled });

  useHotkeys("1", () => onStatusTab(1), { enabled });
  useHotkeys("2", () => onStatusTab(2), { enabled });
  useHotkeys("3", () => onStatusTab(3), { enabled });
  useHotkeys("4", () => onStatusTab(4), { enabled });
  useHotkeys("5", () => onStatusTab(5), { enabled });
}
