"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type BaseItem = { id: string };

interface SelectionContextValue<T extends BaseItem> {
  selectedItems: T[];
  selectedIds: Set<string>;
  select: (item: T) => void;
  deselect: (id: string) => void;
  toggle: (item: T) => void;
  selectAll: (items: T[]) => void;
  selectRange: (items: T[], from: number, to: number) => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
  count: number;
}

type AnySelectionContext = SelectionContextValue<BaseItem>;

const SelectionContext = createContext<AnySelectionContext | null>(null);

interface SelectionProviderProps {
  children: ReactNode;
}

export function SelectionProvider({ children }: SelectionProviderProps) {
  const [selectedItems, setSelectedItems] = useState<BaseItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const select = useCallback((item: BaseItem) => {
    setSelectedItems((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      if (exists) {
        return prev;
      }
      return [...prev, item];
    });
    setSelectedIds((prev) => {
      if (prev.has(item.id)) {
        return prev;
      }
      return new Set([...prev, item.id]);
    });
  }, []);

  const deselect = useCallback((itemId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== itemId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  }, []);

  const toggle = useCallback(
    (item: BaseItem) => {
      if (selectedIds.has(item.id)) {
        deselect(item.id);
      } else {
        select(item);
      }
    },
    [selectedIds, select, deselect]
  );

  const selectAll = useCallback((items: BaseItem[]) => {
    setSelectedItems(items);
    setSelectedIds(new Set(items.map((item) => item.id)));
  }, []);

  const selectRange = useCallback(
    (items: BaseItem[], from: number, to: number) => {
      const start = Math.min(from, to);
      const end = Math.max(from, to);
      const rangeItems = items.slice(start, end + 1);

      setSelectedItems((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newItems = rangeItems.filter((item) => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });

      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const item of rangeItems) {
          next.add(item.id);
        }
        return next;
      });
    },
    []
  );

  const clear = useCallback(() => {
    setSelectedItems([]);
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (itemId: string) => selectedIds.has(itemId),
    [selectedIds]
  );

  const count = selectedItems.length;

  const value = useMemo<AnySelectionContext>(
    () => ({
      selectedItems,
      selectedIds,
      select,
      deselect,
      toggle,
      selectAll,
      selectRange,
      clear,
      isSelected,
      count,
    }),
    [
      selectedItems,
      selectedIds,
      select,
      deselect,
      toggle,
      selectAll,
      selectRange,
      clear,
      isSelected,
      count,
    ]
  );

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection<T extends BaseItem>(): SelectionContextValue<T> {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error("useSelection must be used within SelectionProvider");
  }
  return context as unknown as SelectionContextValue<T>;
}

export type { BaseItem, SelectionContextValue };
