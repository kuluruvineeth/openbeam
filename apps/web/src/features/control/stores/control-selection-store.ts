import { create } from "zustand";

type ControlSelectionState = {
  selectedIds: Set<string>;
  toggle: (id: string) => void;
  select: (ids: string[]) => void;
  deselect: (ids: string[]) => void;
  selectAll: (ids: string[]) => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
};

export const useControlSelection = create<ControlSelectionState>(
  (set, get) => ({
    selectedIds: new Set(),

    toggle: (id) =>
      set((state) => {
        const next = new Set(state.selectedIds);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return { selectedIds: next };
      }),

    select: (ids) =>
      set((state) => {
        const next = new Set(state.selectedIds);
        for (const id of ids) {
          next.add(id);
        }
        return { selectedIds: next };
      }),

    deselect: (ids) =>
      set((state) => {
        const next = new Set(state.selectedIds);
        for (const id of ids) {
          next.delete(id);
        }
        return { selectedIds: next };
      }),

    selectAll: (ids) => set({ selectedIds: new Set(ids) }),

    clear: () => set({ selectedIds: new Set() }),

    isSelected: (id) => get().selectedIds.has(id),
  })
);
